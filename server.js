
require('dotenv').config();
const Promise = require('es6-promise').Promise;
const crypto  = require('crypto');
const moment  = require('moment');
const express = require('express');
const app     = express();

app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/views'));

// Environment Settings
var s3Url  = process.env.s3Url;
var aws    = {
    accessKey: process.env.accessKey,
    secretKey: process.env.secretKey
};

// Functions
const getRandomName = function(){
    let hash     = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < 10; i++){
        hash += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return `${hash + Date.now()}.mp4`;
}

const getSignature = function(){
    return new Promise(function (resolve){
        let expiration  = moment().add(1, 'h').toDate();
        let s3Policy = {
            'expiration': expiration,
            'conditions': [{
                    'bucket': process.env.bucket
                },
                {
                    'acl': 'private'
                },
                ['content-length-range', 0, 10485760],
                ['starts-with', '$key', ''],
                ['starts-with', '$Content-Type', '']

            ]
        };

        let stringPolicy = JSON.stringify(s3Policy);
        let base64Policy = new Buffer(stringPolicy, 'utf-8').toString('base64');

        let signature = crypto.createHmac('sha1', aws.secretKey)
            .update(new Buffer(base64Policy, 'utf-8')).digest('base64');

        let credentials = {
            url: s3Url,
            fields: {
                key: getRandomName(),
                AWSAccessKeyId: `${aws.accessKey}`,
                acl: 'private',
                policy: base64Policy,
                signature: signature,
                'Content-Type': 'video/mp4',
                success_action_status: 201
            }
        };

        resolve(credentials);
    });
}

app.get('/',function(req, res) {
    getSignature().then((credentials) =>{
        res.render('index', {
            url: s3Url,
            credentials: credentials
        });
    });
});

app.listen(8004, () => console.log('http://localhost:8004'));