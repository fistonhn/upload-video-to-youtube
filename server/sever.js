const express = require('express');
const cors = require('cors');
const youtube = require('youtube-api');
const fbUpload = require('facebook-api-video-upload');
const open = require('open');
const multer = require('multer');
const fs = require('fs');
const fetch = require('node-fetch');
const credentials = require('./credentials.json');


const app = express();

app.use(express.json());

app.use(cors());



const storage = multer.diskStorage({

    destination: './',
  
    filename(req, file, cb) {
      cb(null, new Date().getTime() / 1000 + file.originalname);
    },
});

const upload = multer({
    storage,
}).single('videoFile');


// ..................Upload to Youtube.....................

const oauth = youtube.authenticate({
    type: "oauth"
  , client_id: credentials.web.client_id
  , client_secret: credentials.web.client_secret
  , redirect_url: credentials.web.redirect_uris[0]
});

app.post('/upload', upload, (req,res)=>{
    if(req.file){
        const filename = req.file.filename;
        const { title, description } = req.body; 

        open(oauth.generateAuthUrl({
            access_type: "offline"
          , scope: ["https://www.googleapis.com/auth/youtube.upload"]
          , state: JSON.stringify({ filename, title, description })
        }));
    }
});

app.get('/oath2callback', (req, res)=>{


    res.redirect('http://localhost:3000/success')
    const { filename, title, description } = JSON.parse(req.query.state)


    oauth.getToken(req.query.code, (error, tokens)=>{
        if(error){
            console.log(error)
            return
        }

        oauth.setCredentials(tokens)

        youtube.videos.insert({
            resource: {
                snippet: { title, description },
                status: { privacyStatus: "private" }
            }
            , part: "snippet,status"
            , media: {
                body: fs.createReadStream(filename)
            }

        }, (err, data) => {
            console.log(err);
            console.log("Done.");
            process.exit();
        })
    })
})



// ..................Upload to IG.....................

// POST graph.facebook.com/17841400008460056/media
//   ?media_type=VIDEO
//   &video_url=https//www.example.com/videos/hungry-fonzes.mov
//   &caption=%23Heyyyyyyyy!


app.post('/instagramPost', upload, async(req,res)=>{

    const filename = req.file.filename;
    const { title } = req.body; 

    const mediaType = "VIDEO"
    const video = filename


    const response = await fetch(`https://graph.facebook.com/17841400008460056/media?media_type=${mediaType}&video_url=${video}&caption=${title}`, {
	method: 'post',
	headers: {'Content-Type': 'application/json'}
    
});
console.log('response', response)

});

const port = 4000;

app.listen(port, () => console.log(`listening to port ${port}....`));
