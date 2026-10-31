// src/mediaStreams.ts
function decodableAudioStream(streams) {
  const index = streams.filter((stream) => stream.codec_type === "audio").findIndex((stream) => stream.codec_name !== void 0);
  return index < 0 ? null : index;
}
export {
  decodableAudioStream
};
