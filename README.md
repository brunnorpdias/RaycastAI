<p><a target="_blank" href="https://app.eraser.io/workspace/VBvaCBKt77TFWhQELege" id="edit-in-eraser-github-link"><img alt="Edit in Eraser" src="https://firebasestorage.googleapis.com/v0/b/second-petal-295822.appspot.com/o/images%2Fgithub%2FOpen%20in%20Eraser.svg?alt=media&amp;token=968381c8-a7e7-472a-8ed6-4a6626da5501"></a></p>

This extension is meant to be used with [﻿Raycast](https://www.raycast.com/) to access LLMs using the various different clients. Currently supported Large Language Models include:

- [﻿OpenAI](https://platform.openai.com/docs/overview) 
- [﻿Anthropic](https://docs.anthropic.com/en/docs/welcome)  
- [﻿Google's Deepmind](https://ai.google.dev/gemini-api/docs) 
- [﻿OpenRouter](https://openrouter.ai/) (Grok, Groq, Perplexity, and more)
## Advantages
Simply, the main advantages are the speed of interaction with the LLM, the privacy (in most cases companies don't collect data from API interactions), and reduced cost while using the latest LLMs.

## Architecture
![architecture](/.eraser/VBvaCBKt77TFWhQELege___voy3D43Ta3VlYP0pyhSh3YYlfle2___---figure---DT_g-Y6tzVCMJ6yttSZbX---figure---Yc791tpbY0sd8sfmHtU-0g.png "architecture")

## Limitations
This is a quick list of some of the limitations on this current version.

### Onboarding
Currently the extension is meant for personal use, thus it doesn't have a consumer friendly onboarding process. All api codes are stored in a JSON file in `src/enums/api_keys.tsx` with this format:

```
export const API_KEYS = {
  ANTHROPIC: '',
  OPENAI: '',
  DEEPMIND: '',
  OPENROUTER: '',
}
```
### Files and Continuation
While file uploads are now supported with the latest version—using [﻿OpenAI](https://platform.openai.com/docs/guides/pdf-files?api-mode=responses), [﻿Anthropic](https://docs.anthropic.com/en/docs/build-with-claude/pdf-support), and [﻿Google](https://ai.google.dev/gemini-api/docs/document-processing?lang=python)—the experience is not as seamless as using a proprietary application (at least using Raycast). This issue also affects long chats. Although the latest chats and assistant interactions will be saved in Raycast's cache, continuation and recalling conversations and information aren't as straightforward as with proprietary applications.

### Google Support
Support for DeepMind has since been fixed after Google released the `GenAI`  socket, but the experience is not as seemless as other providers.

### Audio
Transcription of audios and text-to-speech are now supported using OpenAI, but user's cannot dictate their answers directly or use live conversations as Raycast doesn't provide a way of directly recording audio. Generated audios are not shown inside Raycast or played automatically, but saved on the user's downloads file (mac).



<!--- Eraser file: https://app.eraser.io/workspace/VBvaCBKt77TFWhQELege --->