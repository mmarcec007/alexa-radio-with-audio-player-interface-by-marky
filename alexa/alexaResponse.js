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

module.exports.startRadioStream = function (radioStream, textToSpeak = '') {
    let response = {
        "version": "1.0",
        "response": {
            "directives": [
                {
                    "type": "AudioPlayer.Play",
                    "playBehavior": "REPLACE_ALL",
                    "audioItem": {
                        "stream": {
                            "url": radioStream.stream_url,
                            "token": radioStream.name.replace(/\s/g, '-') + '?' + Date.now(),
                            "offsetInMilliseconds": 0
                        },
                        "metadata": {
                            "title": radioStream.name,
                            "subtitle": radioStream.slogan,
                            "art": {
                                "sources": [
                                    radioStream.art
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

module.exports.stopRadioStream = function (shouldEndSession = false) {
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
