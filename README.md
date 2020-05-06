# facebook-api-video-upload
> Upload a video in chunk on the facebook api. [more info](https://developers.facebook.com/docs/graph-api/video-uploads)

## Install
```
$ npm i fb-upload-video-api --save
```
Tested on OS X and Linux.

## Usage
```javascript
const fs = require('fs');
const MovieUpload = require('fb-upload-video-api');

const emitter = new MovieUpload();

const args = {
  token: "YOURTOKEN",  // with the permission to upload
  id: "YOURID",       //The id represent {page_id || user_id || event_id || group_id}
  videoSize: size    // integer
};

(async ()=>{
  try{
    // Recieve start_offset and end_offset of facebook init and upload_chunk api
    emitter.on('slice_chunk', (start, end)=>{
      const chunkStream = fs.createReadStream('./fixture.mp4', {
        start: Number(start), //integer
        end: Number(end)     // integer
      });
      // Emit chunk to upload
      emitter.emit('chunk', chunkStream)
    })

    // Show percent of uploading
    emitter.on('upload', (percent)=>{
      console.log(percent);
    })

    const video_id = await emitter.uploadToFB(args);
    console.log(video_id);

  }catch(err){
    console.error(err)
  }
})()
```

## Features
- Support upload videos larger than 2gb (maximun size of buffer in nodejs)
- Don't need to load all video into buffer

## License
MIT © [MrdotB](https://github.com/MRdotB)
