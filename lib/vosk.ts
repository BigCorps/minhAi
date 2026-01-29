import * as Vosk from "vosk-browser";

let model: any = null;

export async function loadVosk() {
  if (model) return model;

  model = await Vosk.createModel(
    "/models/vosk-pt/vosk-model-small-pt-0.3"
  );

  return model;
}