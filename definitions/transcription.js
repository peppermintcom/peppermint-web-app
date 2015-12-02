module.exports = {
  title: 'Transcription',
  type: 'object',
  properties: {
    'transcription_url': {
      type: 'string',
      description: 'location of this transcription resource',
    },
    'audio_url': {
      type: 'string',
      description: 'canonical_url where the audio_file can be downloaded, such as http:/go.peppermint.com/xyz/abc.m4a',
      pattern: 'go\.peppermint\.com\/',
    },
    'language': {
      type: 'string',
      description: 'BCP47 valid language',
    },
    'confidence': {
      type: 'number',
      format: 'float',
      description: 'confidence value between 0 and 1',
      minimum: 0,
      maximum: 1,
    },
    'text': {
      type: 'string',
      description: 'the transcription',
      minLength: 1,
    },
    ip: {type: 'string'},
    timestamp: require('./timestamp'),
  },
};
