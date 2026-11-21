/**
 * PostCraft AI — Frontend Application Logic
 * Modern GenAI LinkedIn Post Generator
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM References
  const form = document.getElementById('generate-form');
  const topicInput = document.getElementById('topic-input');
  const lengthSelect = document.getElementById('length-select');
  const languageSelect = document.getElementById('language-select');
  const toneSelect = document.getElementById('tone-select');
  const generateBtn = document.getElementById('generate-btn');
  const clearBtn = document.getElementById('clear-btn');
  const regenerateBtn = document.getElementById('regenerate-btn');
  const copyBtn = document.getElementById('copy-btn');
  const copyBtnText = document.getElementById('copy-btn-text');
  const formFeedback = document.getElementById('form-feedback');

  const outputLoading = document.getElementById('output-loading');
  const outputResult = document.getElementById('output-result');
  const postOutputText = document.getElementById('post-output-text');
  const postStatsText = document.getElementById('post-stats-text');
  const examplesCountText = document.getElementById('examples-count-text');
  const suggestionChips = document.querySelectorAll('.chip-btn');

  // Generation State (Strictly initialized as false)
  const state = {
    isGenerating: false,
    hasGenerated: false,
    post: '',
    examplesUsed: 0,
    error: null
  };

  // Initialize
  init();

  function init() {
    // 1. Enforce initial state: no spinner, no post, no error
    state.isGenerating = false;
    state.hasGenerated = false;
    state.post = '';
    state.examplesUsed = 0;
    state.error = null;
    render();

    // 2. Setup listeners & dynamic data
    setupEventListeners();
    setupTextareaAutoResize();
    loadOptions();
  }

  /**
   * Central render function conditionally showing/hiding sections based strictly on state
   */
  function render() {
    // 1. Loading Section: Conditionally displayed ONLY when isGenerating is true
    if (state.isGenerating) {
      outputLoading.style.display = 'flex';
      outputLoading.removeAttribute('hidden');
      generateBtn.disabled = true;
      const btnText = generateBtn.querySelector('.btn-text');
      if (btnText) btnText.textContent = 'Creating post...';
    } else {
      outputLoading.style.display = 'none';
      outputLoading.setAttribute('hidden', '');
      generateBtn.disabled = false;
      const btnText = generateBtn.querySelector('.btn-text');
      if (btnText) btnText.textContent = 'Generate LinkedIn Post';
    }

    // 2. Generated Post Card: Conditionally displayed ONLY when generation succeeded and not in progress
    if (!state.isGenerating && state.hasGenerated && state.post) {
      outputResult.style.display = 'flex';
      outputResult.removeAttribute('hidden');
      postOutputText.textContent = state.post;
      if (examplesCountText) {
        examplesCountText.textContent = `${state.examplesUsed} few-shot example${state.examplesUsed === 1 ? '' : 's'} applied`;
      }

      const words = state.post.trim().split(/\s+/).filter(Boolean).length;
      const chars = state.post.length;
      if (postStatsText) {
        postStatsText.textContent = `~${words} words • ${chars} characters`;
      }
    } else {
      outputResult.style.display = 'none';
      outputResult.setAttribute('hidden', '');
    }

    // 3. Feedback / Error banner
    if (state.error) {
      formFeedback.textContent = state.error;
      formFeedback.className = 'form-feedback error';
      formFeedback.style.display = 'flex';
      formFeedback.removeAttribute('hidden');
    } else {
      formFeedback.textContent = '';
      formFeedback.style.display = 'none';
      formFeedback.setAttribute('hidden', '');
    }
  }

  function setupEventListeners() {
    // Form submit
    form.addEventListener('submit', handleGenerate);

    // Regenerate
    if (regenerateBtn) {
      regenerateBtn.addEventListener('click', () => {
        if (!state.isGenerating && topicInput.value.trim()) {
          form.dispatchEvent(new Event('submit'));
        }
      });
    }

    // Clear
    if (clearBtn) {
      clearBtn.addEventListener('click', handleClear);
    }

    // Copy to clipboard
    if (copyBtn) {
      copyBtn.addEventListener('click', handleCopy);
    }

    // Suggestion chips
    suggestionChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        const topic = chip.dataset.topic || chip.textContent.trim();
        topicInput.value = topic;
        triggerTextareaResize(topicInput);
        topicInput.focus();
        state.error = null;
        render();
      });
    });

    // Clear error feedback when typing
    topicInput.addEventListener('input', () => {
      if (state.error) {
        state.error = null;
        render();
      }
    });
  }

  /**
   * Auto-resizes the composer textarea as the user types
   */
  function setupTextareaAutoResize() {
    topicInput.addEventListener('input', () => {
      triggerTextareaResize(topicInput);
    });
  }

  function triggerTextareaResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(110, textarea.scrollHeight)}px`;
  }

  /**
   * Fetches supported options from backend to ensure synchronization
   */
  async function loadOptions() {
    try {
      const response = await fetch('/api/options');
      if (!response.ok) return;

      const data = await response.json();
      if (!data.success) return;

      // Ensure language options match backend supported list
      if (Array.isArray(data.languages)) {
        const currentLangs = Array.from(languageSelect.options).map((o) => o.value);
        data.languages.forEach((lang) => {
          if (!currentLangs.includes(lang)) {
            const opt = document.createElement('option');
            opt.value = lang;
            opt.textContent = lang;
            languageSelect.appendChild(opt);
          }
        });
      }
    } catch (err) {
      console.warn('Could not refresh dynamic options:', err.message);
    }
  }

  /**
   * Main generation handler
   */
  async function handleGenerate(e) {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    const topic = topicInput.value.trim();
    const length = lengthSelect.value;
    const language = languageSelect.value;
    const tone = toneSelect ? toneSelect.value : 'Professional';

    // Validation
    if (!topic) {
      state.error = 'Please enter or select a topic to generate your LinkedIn post.';
      render();
      topicInput.focus();
      return;
    }

    if (topic.length < 2) {
      state.error = 'Topic must be at least 2 characters long.';
      render();
      topicInput.focus();
      return;
    }

    // Set loading to true immediately before sending the generation API request
    state.isGenerating = true;
    state.error = null;
    render();

    // Smooth scroll to loading section
    setTimeout(() => {
      if (state.isGenerating && outputLoading) {
        outputLoading.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ topic, length, language, tone })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        const errorMsg = result.error || `Generation failed (HTTP ${response.status})`;
        throw new Error(errorMsg);
      }

      // Success
      state.post = result.generatedPost || '';
      state.examplesUsed = result.examplesUsed || 0;
      state.hasGenerated = true;
      state.error = null;
    } catch (error) {
      console.error('Generation error:', error);
      state.error = error.message;
      state.hasGenerated = false;
    } finally {
      // Set loading to false in the finally block after request completes (whether success or fail)
      state.isGenerating = false;
      render();

      // Reset copy button state
      resetCopyButton();

      // Smooth scroll to output card if generation succeeded
      if (state.hasGenerated && outputResult) {
        setTimeout(() => {
          outputResult.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    }
  }

  /**
   * Resets form, state, and UI
   */
  function handleClear() {
    topicInput.value = '';
    topicInput.style.height = '110px';
    lengthSelect.value = 'Medium';
    languageSelect.value = 'English';
    if (toneSelect) toneSelect.value = 'Professional';

    state.isGenerating = false;
    state.hasGenerated = false;
    state.post = '';
    state.examplesUsed = 0;
    state.error = null;

    render();
    resetCopyButton();
    topicInput.focus();
  }

  /**
   * Clipboard API with fallback
   */
  async function handleCopy() {
    if (!state.post) return;

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(state.post);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = state.post;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }

      // Visual feedback
      copyBtn.classList.add('copied');
      copyBtnText.textContent = '✓ Copied to Clipboard!';
      setTimeout(resetCopyButton, 2200);
    } catch (err) {
      console.error('Copy failure:', err);
      state.error = 'Unable to copy text to clipboard.';
      render();
    }
  }

  function resetCopyButton() {
    if (copyBtn) {
      copyBtn.classList.remove('copied');
      copyBtnText.textContent = 'Copy to Clipboard';
    }
  }
});
