const rp = require('request-promise')
const { EventEmitter } = require('events')

const url = 'https://graph-video.facebook.com'
const version = 'v3.2'

class UploadMovie extends EventEmitter {
  constructor() {
    super();
    this.retry = 0
    this.retryMax = 10
  }

  uploadToFB(args) {
    return new Promise((resolve, reject) => {
      this._appInit({
        id: args.id,
        token: args.token
      }, args.videoSize).then(({
        video_id,
        start_offset,
        end_offset,
        upload_session_id
      }) => {
        this.start_offset = start_offset;
        this.end_offset = end_offset;

        this.on('chunk', (stream) => {
          const bufs = [];

          stream.on('data', (data) => {
            bufs.push(data);
          })

          stream.on('end', () => {
            this.chunk = Buffer.concat(bufs);
            this.emit('upload_chunk', this.chunk);
          })
        })

        this.on('upload_chunk', async (chunk) => {
          try {
            const res = await this._uploadChunk(
              { id: args.id, token: args.token },
              upload_session_id, this.start_offset, chunk)

            this.start_offset = res.start_offset;
            this.end_offset = res.end_offset;

            if (this.start_offset === this.end_offset) {
              const response = await this._apiFinish(
                { id: args.id, token: args.token }, upload_session_id)
              resolve(video_id)

            } else {
              this.emit('upload', (this.end_offset * 100) / args.videoSize);
              this.emit('slice_chunk', this.start_offset, this.end_offset);
            }

          } catch (err) {
            reject(err)
          }
        })

        this.emit('slice_chunk', this.start_offset, this.end_offset);
      }).catch(err => reject(err))
    })
  }

  _appInit({ id, token }, videoSize) {
    const options = {
      method: 'POST',
      uri: `${url}/${version}/${id}/videos?access_token=${token}`,
      json: true,
      form: {
        upload_phase: 'start',
        file_size: videoSize
      }
    }

    return rp(options);
  }

  _apiFinish({ id, token }, upload_session_id) {
    const options = {
      method: 'POST',
      json: true,
      uri: `${url}/${version}/${id}/videos`,
      formData: {
        upload_session_id,
        access_token: token,
        upload_phase: 'finish',
      }
    }

    return rp(options)
  }

  _uploadChunk({ id, token }, upload_session_id, start_offset, chunk) {
    const formData = {
      access_token: token,
      upload_phase: 'transfer',
      start_offset: start_offset,
      upload_session_id: upload_session_id,
      video_file_chunk: {
        value: chunk,
        options: {
          filename: 'chunk'
        }
      }
    }
    const options = {
      method: 'POST',
      uri: `${url}/${version}/${id}/videos`,
      formData: formData,
      json: true
    }

    return rp(options)
      .then(res => {
        this.retry = 0
        return res
      })
      .catch(err => {
        if (this.retry++ >= this.retryMax) {
          throw err
        }
        return this._uploadChunk({ id, token }, upload_session_id, start_offset, chunk)
      })
  }
}

module.exports = UploadMovie;
