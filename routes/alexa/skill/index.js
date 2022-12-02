const express = require('express');
const router = express.Router();
const util = require('util');
const Fuse = require('fuse.js')
const alexaResponse = require('./../../../alexa/alexaResponse');
const radioStations = require('./../../../data/radio_stations.json');
const jwt = require('jsonwebtoken');
const xpath = require('xpath');
const dom = require('xmldom').DOMParser
const axios = require('axios').default;

/* GET users listing. */
router.post('/', async function (req, res, next) {
    console.log(util.inspect(req.body, false, null, true /* enable colors */));
    const {request, context} = req.body;
    let response = alexaResponse.getEmptyResponse();

    switch (request.type) {
        case 'LaunchRequest':
            const text = `Starting ${radioStations[0].name}`;
            response = alexaResponse.startRadioStream(radioStations[0]);
            break;
        case 'IntentRequest':
            switch (request.intent.name) {
                case 'PlayRadioStreamIntent':
                    if (request.intent.slots && request.intent.slots.radioStation &&
                        request.intent.slots.radioStation.slotValue) {
                        const radioStation = request.intent.slots.radioStation.slotValue.value;
                        const currentRadioStation = getRadioStation(radioStation);
                        if (currentRadioStation !== null) {
                            console.log("Got current radio station [" + util.inspect(currentRadioStation, false, null, true) + ']');
                            response = alexaResponse.startRadioStream(currentRadioStation, 'Starting ' + currentRadioStation.name);
                        } else {
                            response = alexaResponse.getTextResponse(radioStation + ' is not available right now. Please try again');
                        }
                    } else {
                        let lastRadioStation = getLastRadioStation(context.AudioPlayer);
                        response = alexaResponse.startRadioStream(lastRadioStation, 'Starting ' + lastRadioStation.name);
                    }
                    break;
                case 'AvailableRadioStationsIntent':
                    response = alexaResponse.getAplListResponse('This is what you can listen to eight now.', radioStations)
                    break;
                case 'AMAZON.PauseIntent':
                case 'AMAZON.StopIntent':
                    response = alexaResponse.stopRadioStream(true);
                    break;
                case 'AMAZON.ResumeIntent':
                    if (context.AudioPlayer) {
                        const playerActivity = context.AudioPlayer.playerActivity;
                        const token = context.AudioPlayer.token;
                        if (context.AudioPlayer.playerActivity !== 'IDLE') {
                            response = alexaResponse.startRadioStream(getLastRadioStation(context.AudioPlayer));
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
                    case 'WhatIsPlayingIntent':
                        response = alexaResponse.getTextResponse('I can\'t get the info at the moment.')
                        if (context.AudioPlayer.playerActivity === 'PLAYING') {
                            const lastRadioStation = getLastRadioStation(context.AudioPlayer);
                            const radioStationOnlineInfoText = await getRadioStationOnlineInfo(lastRadioStation);
                            const shazamSearchResult = await getSongDataFromShazamBySearchTerm(radioStationOnlineInfoText);
                            if (shazamSearchResult instanceof Error) {
                                response = alexaResponse.getSimpleCardResponse('Sorry I wasn\'t able to recognize the song.', 'Marky Radio Song Info', shazamSearchResult.message, true);
                            } else {
                                const track = shazamSearchResult?.tracks?.hits[0]?.track;
                                if (track === undefined) {
                                    response = alexaResponse.getSimpleCardResponse(radioStationOnlineInfoText, 'Marky Radio - Song Info', radioStationOnlineInfoText, true);
                                } else {
                                    const speechText = 'This is ' + track.title + ' by ' + track.subtitle;
                                    response = alexaResponse.getStandardCardResponse(speechText, 'Marky Radio - Song Info powered by Shazam', track.subtitle + ' - ' + track.title, track.images.coverart,track.images.coverarthq,true);
                                }
                            }
                        }
                    break;
            }
            break;
        case 'AMAZON.CancelIntent':
        case 'AudioPlayer.PlaybackStarted':
        case 'AudioPlayer.PlaybackStopped':
        case 'AudioPlayer.PlaybackNearlyFinished':
            response = alexaResponse.getEmptyResponse();
            break;
        case 'PlaybackController.PlayCommandIssued':
            response = alexaResponse.startRadioStream(getLastRadioStation(context.AudioPlayer));
            break;
        case 'PlaybackController.PauseCommandIssued':
            response = alexaResponse.stopRadioStream();
            break;
        case 'PlaybackController.NextCommandIssued':
        case 'PlaybackController.PreviousCommandIssued':
            response = alexaResponse.getEmptyResponse();
            break;
        case 'AudioPlayer.PlaybackFailed':
            response = alexaResponse.getEmptyResponse();
            break;
        case 'Alexa.Presentation.APL.UserEvent':
            const arguments = request.arguments;
            const radioStationName = arguments[0].name;
            const radioStation = getRadioStation(radioStationName);
            if (radioStation !== null) {
                console.log("Got current radio station [" + util.inspect(radioStation, false, null, true) + '] via APL User event.');
                let playingStation = '';
                if (context.AudioPlayer.token) {
                    const tokenizedQuery = jwt.decode(context.AudioPlayer.token, 'alexa');
                    playingStation = tokenizedQuery.radioStream.name;
                }
                if (radioStationName === playingStation) {
                    response = alexaResponse.getEmptyResponse();
                } else {
                    response = alexaResponse.startRadioStream(radioStation);
                }
            } else {
                response = alexaResponse.getTextResponse(radioStationName + ' is not available right now. Please try again');
            }
            break;
        case 'SessionEndedRequest':
            response = alexaResponse.getEmptyResponse();
            break;
    }

    console.log(util.inspect(response, false, null, true /* enable colors */));
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
        let tokenizedQuery = jwt.decode(audioPlayer.token, 'alexa');

        const radioStation = getRadioStation(tokenizedQuery.radioStream.name);

        if (radioStation !== null) {
            lastRadioStation = radioStation;
        }
    }

    return lastRadioStation;
}

async function getRadioStationOnlineInfo(radioStation) {
    switch (radioStation.slug) {
        case 'radio-deejay-hr':
            const page = await axios.get('https://deejay.hr/radio/');
            console.log("Printing fetched page", page.data);
            let message = 'Sorry, I was not able to get the current song from '
                + radioStation.name + '. Please try again in a few moments';

            if (page.status === 200) {
                const xpathString = 'string(/html/body/div[2]/section/ol/li[1]/text())';

                var doc = new dom().parseFromString(page.data)
                var currentSong = xpath.select(xpathString, doc)

                console.log('Printing current song', currentSong);
                message = currentSong;
            }

            return message;
        case 'sport-fm':
        case 'country-station':
        case 'memoryhits':
        case 'xmasfm':
        case 'powertrance-one':
        case 'bassfm':
        case 'gaggenau':
            const currentSongResponse = await axios.get('https://api.laut.fm/station/'+radioStation.slug+'/current_song');
            console.log("Printing fetched current song response", currentSongResponse.data);
            let currentSongString = '';
            if (currentSongResponse.status === 200) {
                currentSongString = currentSongResponse.data.artist.name + ' ' + currentSongResponse.data.title;
            }

            return currentSongString;
        default:
            return 'No info is available at hte time for ' + radioStation.name;
    }
}

async function getSongDataFromShazamBySearchTerm (searchTerm) {
    const options = {
        method: 'GET',
        url: 'https://shazam.p.rapidapi.com/search',
        params: {term: searchTerm, offset: '0', limit: '1'},
        headers: {
            'X-RapidAPI-Key': '261a2fad8amsh19119e53fd75434p1435b6jsn72b6a4816a68',
            'X-RapidAPI-Host': 'shazam.p.rapidapi.com'
        }
    };

    const shazamSearchResponse = await axios.request(options);
    if (shazamSearchResponse.status === 200) {
        return shazamSearchResponse.data;
    }

    throw new Error(shazamSearchResponse.statusText);
}

module.exports = router;
