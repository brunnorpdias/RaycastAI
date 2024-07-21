<p><a target="_blank" href="https://app.eraser.io/workspace/qZLzC3nQ7v4oZXxSDSHT" id="edit-in-eraser-github-link"><img alt="Edit in Eraser" src="https://firebasestorage.googleapis.com/v0/b/second-petal-295822.appspot.com/o/images%2Fgithub%2FOpen%20in%20Eraser.svg?alt=media&amp;token=968381c8-a7e7-472a-8ed6-4a6626da5501"></a></p>

This extension is meant to be used with [﻿Raycast](https://www.raycast.com/) to access LLMs using the various different clients. Currently supported Large Language Models include:

- [﻿OpenAI](https://platform.openai.com/docs/overview)﻿
- [﻿Anthropic](https://docs.anthropic.com/en/docs/welcome)﻿
- [﻿Groq](https://console.groq.com/docs/quickstart)﻿
- [﻿Perplexity](https://docs.perplexity.ai/)﻿
- [﻿Google's Deepmind](https://ai.google.dev/gemini-api/docs)﻿ (Discontinued)


## Advantages
Simply, the main advantages are the speed of interaction with the LLM, the privacy (in most cases companies don't collect data from API interactions), and reduced cost while using the latest LLMs.



## Limitations
This is a quick list of some of the limitations on this current version.

### Onboarding
Currently the extension is meant for personal use, thus it doesn't have a consumer friendly onboarding process. All api codes are stored in a JSON file in `src/enums/index.tsx`  with this format:

```
export const API_KEYS = {
  ANTHROPIC: '',
  OPENAI: '',
  GROQ: '',
  DEEPMIND: '',
  PERPLEXITY: '',
}
```
### Files and Continuation
While file uploads are now supported with the latest version—using [﻿OpenAI's Assistants (Beta)](https://platform.openai.com/docs/api-reference/assistants)﻿—the experience is not as seamless as using a proprietary application (at least using Raycast). This issue also affects long chats. Although the latest chats and assistant interactions will be saved in Raycast's cache, continuation and recalling conversations and information aren't as easy.

### Google Support
I couldn't figure out how to use Google's client to access its servers. I suspect it is how it handles `fetch`  declaration differently from other company's software. Hopefully they change or I can find a solution in the future.

### Audio
Voice-to-text and Text-to-voice aren't currently supported (Raycast limitation).

### Math
Raycast renders information using [﻿CommonMark](https://commonmark.org/), which doesn't support math/latex rendering.



## Status
Still improving and adding new features.



## Workflow Diagram
![app diagram](/.eraser/qZLzC3nQ7v4oZXxSDSHT___voy3D43Ta3VlYP0pyhSh3YYlfle2___---figure---VHASJT-b0-k2hJpQh1wWJ---figure---4JWTukElO-Kt22ELfqd_9g.png "app diagram")

Red sections need additional work.



<!--- Eraser file: https://app.eraser.io/workspace/qZLzC3nQ7v4oZXxSDSHT --->