## Inspiration
This application was born out of my own job-hunting experience. During the process, I often needed to provide customized information for various applications, yet I found myself lacking an efficient tool to streamline and optimize that task.

As a user of code agents, I hope to make this kind of intelligent workflow accessible to a wider audience. I believe it represents a great opportunity to help people tackle text-generation and writing tasks more effectively.

## What it does

1. **Chatbot** – An interactive module that enables multi-turn conversations with a prompt-based AI. It supports customized context input and management, allowing users to define or modify the conversational background for more personalized responses.

2. **Copilot** – A contextual writing assistant that activates whenever you interact with an input field or text area on a webpage. The Copilot panel provides intelligent text assistance, allowing you to:

   * **Auto-complete** your current text based on context.
   * **Rewrite** or refine your existing input for better clarity, tone, or style.
   * **Generate** context-aware streaming outputs for specific scenarios (e.g., job applications, emails, summaries) based on your current text as a prompt.

3. **Interaction Design** – The Copilot continuously monitors user focus events (`focusin` and `focusout`) to ensure smooth activation and deactivation.

   * Pressing **TAB** is not supported for auto-filling complete text.
   * Pressing **ESC** cancels the current suggestion or input operation.

## How we built it

1. **Popup Interface**
   The frontend popup page is built with **React** and consists of two main components:

   * **User Component** – manages the contextual data and user-defined inputs.
   * **Chat Component** – handles multi-turn conversations with the AI model.

2. **Background Service**
   The `background.js` file serves as the **core service layer**. It manages all model sessions, including initialization, message handling, and termination of active sessions.

3. **Content Script**
   The `content.js` file is the **core interaction layer** between the extension and the webpage.
   It includes a `Copilot` class responsible for detecting and interacting with DOM elements, managing focus events, and triggering AI-assisted writing actions.

4. **Communication Design**
   To enable communication across the three layers (popup, background, and content), the following mechanisms are used:

   * **`chrome.message`** – handles prompt-related communication, including text completions and multi-turn conversations.

     * We encapsulated this logic in a `MessageManager` class, which simplifies message listening and dispatching with an API-like design.
   * **Persistent `port` connections** – manage communication for **writer** and **rewriter** modules, as these require **streaming outputs**.

5. **Built-in AI Sessions**

   * The **prompt module** runs two separate sessions: one for user dialogue and another dedicated to text completion.
   * Both the **writer** and **rewriter** components use **streaming generation**, producing long-form text outputs based on contextual prompts and user inputs.

## Challenges we ran into

1. **Session Management Challenges**
   Managing multiple model sessions turned out to be a major challenge. Because the models run locally, maintaining multiple active sessions can quickly consume significant system resources.

   * **Solution:** Except for the session used for multi-turn conversations (which we persist by default), all other sessions are instantiated only when needed. When switching modes, we immediately terminate the previous session to free up resources.

2. **Session Startup Latency**
   Another issue is that starting a new model session takes noticeable time. Since sessions are frequently killed and relaunched during mode switches, this sometimes leads to a less smooth user experience.

3. **Asynchronous Initialization Delay**
   Due to the asynchronous nature of model initialization, some interactions may occur before the model is fully ready — resulting in empty or unhandled responses during the initial phase.

## Accomplishments that we're proud of
1. We successfully implemented a practically useful Copilot system, greatly thanks to the built-in AI models, which allowed us to deliver real-life assistance in a simple and completely free way.

2. We built a relatively complete and modular application framework, following a script → background → frontend architecture. Each component operates independently, minimizing cross-dependencies and coupling between modules.

3. Our session management also performed reasonably well, effectively preventing service lag or freezing even when multiple sessions were active.

## What we learned
1. I gained a solid understanding of the core features of Chrome extensions, including message handling mechanisms and port-based communication management.

2. I learned how to use extensions to interact directly with web pages, enabling real-time communication and dynamic content manipulation.

3. The project came with its share of challenges and moments of self-doubt, but completing it brought a tremendous sense of achievement and growth.
## What's next 

1. **Explore more efficient session initialization methods** to improve performance and enhance the overall interaction experience.
2. **Optimize text completion capabilities** — the current implementation struggles with managing long-text outputs, occasionally producing irrelevant or incoherent content.
3. **Research advanced similarity computation techniques** similar to those used in real Copilot systems, aiming to achieve more contextually relevant completions.
4. **Improve caching mechanisms** to enhance generation smoothness and ensure a more seamless user experience.

