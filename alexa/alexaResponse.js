const jwt = require('jsonwebtoken');

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
    let token = jwt.sign({
        radioStream: radioStream,
        timestamp: Date.now(),
        initiatedBy: "radio"
    }, 'alexa');

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
                            "token": token,
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

module.exports.getAplListResponse = function (text, stationsList) {
    let apl = {
        "type": "Alexa.Presentation.APL.RenderDocument",
        "token": "episodesListToken",
        "document": {
            "type": "APL",
            "version": "1.6",
            "extensions": [
                {
                    "name": "Back",
                    "uri": "aplext:backstack:10"
                }
            ],
            "settings": {
                "Back": {
                    "backstackId": "radioStreamsList"
                }
            },
            "theme": "dark",
            "import": [
                {
                    "name": "alexa-layouts",
                    "version": "1.3.0"
                }
            ],
            "mainTemplate": {
                "parameters": [
                    "payload"
                ],
                "items": [
                    {
                        "type": "AlexaImageList",
                        "headerTitle": "${payload.textListData.title}",
                        "headerBackButton": false,
                        "headerAttributionImage": "${payload.textListData.logoUrl}",
                        "backgroundImageSource": "${payload.textListData.backgroundImage.sources[0].url}",
                        "listItems": "${payload.textListData.listItems}",
                        "touchForward": true,
                        "id": "radioStationsList"
                    }
                ]
            }
        },
        "datasources": {
            "textListData": {
                "type": "object",
                "objectId": "textListSample",
                "backgroundImage": {
                    "contentDescription": null,
                    "smallSourceUrl": null,
                    "largeSourceUrl": null,
                    "sources": [
                        {
                            "url": "https://static.vecteezy.com/system/resources/previews/001/379/971/non_2x/vintage-and-retro-music-radio-background-free-vector.jpg",
                            "size": "large"
                        }
                    ]
                },
                "title": "Available Radio Stations",
                "listItems": [],
                "logoUrl": "https://d2o906d8ln7ui1.cloudfront.net/images/templates_v3/logo/logo-modern-botanical-white.png"
            }
        },
        "sources": {}
    };

    apl.datasources.textListData.listItems = stationsList.map(item => {
        return {
            "primaryText": item.name,
            "imageSource": item.art.url,
            "primaryAction": [
                {
                    "type": "SendEvent",
                    "arguments": [
                        {
                            "type": "radioStation",
                            "name": item.name
                        }
                    ]
                }
            ]
        }
    });

    return {
        "version": "1.0",
        "response": {
            "outputSpeech": {
                "type": "PlainText",
                "text": text
            },
            "directives": [
                apl
            ],
            "shouldEndSession": false
        }
    }
}
