import url from 'url'

var contentTypes = {
  'mp3': 'audio/mpeg',
  'm4a': 'audio/mp4',
};
function decodePathname(pathname: string): Object {
  var urlParts = url.parse(pathname);
  if (!urlParts.pathname) {
    throw new Error(pathname);
  }
  if (urlParts.pathname.indexOf('/') === 0) {
    urlParts.pathname = urlParts.pathname.substring(1);
  }
  var pathParts = urlParts.pathname.split(/\//);
  if (!pathParts || pathParts.length !== 2) {
    throw new Error(pathname);
  }
  var fileParts = pathParts[1].split(/\./);
  if (!fileParts || fileParts.length !== 2) {
    throw new Error(pathname);
  }
  var contentType = contentTypes[fileParts[1]];
  if (!contentType) {
    throw new Error(pathname);
  }

  return {
    id: fileParts[0],
    recorder_id: pathParts[0],
    content_type: contentType,
  };
}

var extensions = {
  'audio/mpeg': '.mp3',
  'audio/mp3': '.mp3',
  'audio/mp4': '.m4a',
};

function encodePathname(obj: Object): string {
  return [obj.recorder_id, '/', obj.id, extensions[obj.content_type]].join('');
}

export default {encodePathname, decodePathname}
