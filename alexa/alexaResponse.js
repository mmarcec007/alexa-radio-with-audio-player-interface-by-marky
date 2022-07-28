module.exports.getTextResponse = function (text, shouldEndSession = false) {
    return {
        "version": "1.0",
        "response": {
            "outputSpeech": {
                "type": "PlainText",
                "text": text
            },
            "shouldEndSession": shouldEndSession
        }
    }
}

module.exports.getEmptyResponse = function () {
    return {
        "version": "1.0",
        "response": {}
    }
}

module.exports.playSong = function (song, textToSpeak = '', offset = 0) {
    let response = {
        "version": "1.0",
        "response": {
            "directives": [
                {
                    "type": "AudioPlayer.Play",
                    "playBehavior": "REPLACE_ALL",
                    "audioItem": {
                        "stream": {
                            "url": song.stream_url,
                            "token": song.name.replace(/\s/g, '-') + '?' + Date.now(),
                            "offsetInMilliseconds": offset
                        },
                        "metadata": {
                            "title": song.name,
                            "subtitle": song.slogan,
                            "art": {
                                "sources": [
                                    song.art
                                ]
                            }
                        }
                    }
                }
            ]
        }
    };

    if (textToSpeak !== '') {
        response.response.outputSpeech = {};
        response.response.outputSpeech.type = "PlainTet";
        response.response.outputSpeech.text = textToSpeak;
    }

    return response;
}

module.exports.enqueueSong = function (currentSong, previousSongToken) {
    return {
        "version": "1.0",
        "response": {
            "directives": [
                {
                    "type": "AudioPlayer.Play",
                    "playBehavior": "ENQUEUE",
                    "audioItem": {
                        "stream": {
                            "url": currentSong.url,
                            "token": currentSong.name,
                            "expectedPreviousToken": previousSongToken,
                            "offsetInMilliseconds": 0,
                            "captionData": {
                                "content": "WEBVTT\n\n00:00.000 --> 00:02.107\n<00:00.006>My <00:00.0192>Audio <00:01.232>Captions.\n",
                                "type": "WEBVTT"
                            }
                        },
                        "metadata": {
                            "title": "title of the track to display",
                            "subtitle": "subtitle of the track to display",
                        }
                    }
                }
            ]
        }
    }
}

module.exports.stopSong = function (shouldEndSession = false) {
    return {
        "version": "1.0",
        "response": {
            "shouldEndSession": shouldEndSession,
            "directives": [
                {
                    "type": "AudioPlayer.Stop",
                }
            ]
        }
    }
}

module.exports.clearQueue = function (clearBehaviour) {
    return {
        "type": "AudioPlayer.ClearQueue",
        "clearBehavior" : clearBehaviour
    }
}
