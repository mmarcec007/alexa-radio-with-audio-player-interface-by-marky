const express = require('express');
const router = express.Router();
const util = require('util');
const Fuse = require('fuse.js')
const alexaResponse = require('./../../../alexa/alexaResponse');
const radioStations = require('./../../../data/radio_stations.json');

/* GET users listing. */
router.post('/', function (req, res, next) {
    console.log(util.inspect(req.body, false, null, true /* enable colors */));
    const {request, context} = req.body;
    let response = alexaResponse.getEmptyResponse();

    switch (request.type) {
        case 'LaunchRequest':
            const text = `Starting ${radioStations[0].name}`;
            response = alexaResponse.playSong(radioStations[0]);
            break;
        case 'IntentRequest':
            switch (request.intent.name) {
                case 'PlayRadioStreamIntent':
                    if (request.intent.slots && request.intent.slots.radioStation) {
                        const radioStation = request.intent.slots.radioStation.slotValue.value;
                        const currentRadioStation = getRadioStation(radioStation);
                        if (currentRadioStation !== null) {
                            console.log("Got current radio station [" + util.inspect(currentRadioStation, false, null, true) + ']');
                            response = alexaResponse.playSong(currentRadioStation);
                        } else {
                            response = alexaResponse.getTextResponse(radioStation + ' is not available right now. Please try again');
                        }
                    } else {
                        let lastRadioStation = getLastRadioStation(context.AudioPlayer);
                        response = alexaResponse.playSong(lastRadioStation);
                    }
                    break;
                case 'AMAZON.PauseIntent':
                case 'AMAZON.StopIntent':
                case 'AMAZON.CancelIntent':
                    response = alexaResponse.stopSong(true);
                    break;
                case 'AMAZON.ResumeIntent':
                    if (context.AudioPlayer) {
                        const playerActivity = context.AudioPlayer.playerActivity;
                        const token = context.AudioPlayer.token;
                        if (context.AudioPlayer.playerActivity !== 'IDLE') {
                            response = alexaResponse.playSong(getLastRadioStation(context.AudioPlayer));
                        } else {
                            response = alexaResponse.getEmptyResponse();
                        }
                    } else {
                        response = alexaResponse.getEmptyResponse();
                    }
                    break;
                case 'AMAZON.RepeatIntent':
                case 'AMAZON.StartOverIntent':
                case 'AMAZON.NextIntent':
                case 'AMAZON.PreviousIntent':
                case 'AMAZON.LoopOnIntent':
                case 'AMAZON.LoopOffIntent':
                case 'AMAZON.ShuffleOnIntent':
                case 'AMAZON.ShuffleOffIntent':
                    response = alexaResponse.getTextResponse('This action is not supported for the current audio stream.', true);
                    break;
            }
            break;
        case 'AudioPlayer.PlaybackStarted':
            response = alexaResponse.getEmptyResponse();
            break;
        case 'AudioPlayer.PlaybackStopped':
        case 'AudioPlayer.PlaybackNearlyFinished':
            response = alexaResponse.getEmptyResponse();
            break;
        case 'PlaybackController.PlayCommandIssued':
            response = alexaResponse.playSong(getLastRadioStation(context.AudioPlayer));
            break;
        case 'PlaybackController.PauseCommandIssued':
            response = alexaResponse.stopSong();
            break;
        case 'PlaybackController.NextCommandIssued':
        case 'PlaybackController.PreviousCommandIssued':
            response = alexaResponse.getEmptyResponse();
            break;
        case 'SessionEndedRequest':
            response = alexaResponse.getEmptyResponse();
            break;
    }

    res.send(response);
});

function getRadioStation(searchString) {
    const fuse = new Fuse(radioStations, {
        includeScore: true,
        keys: ['name']
    });
    const result = fuse.search(searchString)
    console.log("Trying to find radio station under name [" + searchString + ']');
    console.log(result);
    if (result.length === 0) {
        return null;
    }
    return result[0].item;
}

function getLastRadioStation(audioPlayer) {
    let lastRadioStation = radioStations[0];

    if (audioPlayer.token) {
        let tokenizedQuery = audioPlayer.token;
        tokenizedQuery = tokenizedQuery.replace(/-/g, ' ');
        tokenizedQuery = tokenizedQuery.replace(/\?.*/,'');

        const radioStation = getRadioStation(tokenizedQuery);

        if (radioStation !== null) {
            lastRadioStation = radioStation;
        }
    }

    return lastRadioStation;
}

module.exports = router;
