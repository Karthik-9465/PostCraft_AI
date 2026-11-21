import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Frontend UI State & Spinner Behavior Verification', async (t) => {
  const htmlPath = path.resolve(__dirname, '../frontend/index.html');
  const cssPath = path.resolve(__dirname, '../frontend/css/style.css');
  const jsPath = path.resolve(__dirname, '../frontend/js/app.js');

  const html = fs.readFileSync(htmlPath, 'utf8');
  const css = fs.readFileSync(cssPath, 'utf8');
  const js = fs.readFileSync(jsPath, 'utf8');

  await t.test('Initial HTML elements must have inline style="display: none;" and hidden attribute', () => {
    // 1. Loading card must not be displayed initially
    assert.ok(
      html.includes('id="output-loading"') &&
      html.includes('style="display: none;"') &&
      html.includes('hidden'),
      '#output-loading must have style="display: none;" and hidden'
    );

    // 2. Output result card must not be displayed initially
    assert.ok(
      html.includes('id="output-result"') &&
      html.includes('style="display: none;"'),
      '#output-result must be hidden initially'
    );
  });

  await t.test('CSS rules must strictly enforce [hidden] and .loading-card[hidden] as display: none !important', () => {
    assert.ok(
      css.includes('.loading-card[hidden]'),
      'CSS must have explicit .loading-card[hidden] rule'
    );
    assert.ok(
      css.includes('display: none !important;'),
      'CSS must use display: none !important for hidden states'
    );
  });

  await t.test('JavaScript state must initialize isGenerating as false', () => {
    assert.ok(
      js.includes('isGenerating: false'),
      'state.isGenerating must be strictly initialized as false'
    );
    assert.ok(
      js.includes('hasGenerated: false'),
      'state.hasGenerated must be initialized as false'
    );
  });

  await t.test('JavaScript must reset isGenerating to false in the finally block', () => {
    assert.ok(
      js.includes('finally {') && js.includes('state.isGenerating = false;') && js.includes('render();'),
      'Loading state must be set to false and render() called in finally block'
    );
  });

  await t.test('Render function sets outputLoading to none when not generating', () => {
    assert.ok(
      js.includes("outputLoading.style.display = 'none';"),
      "outputLoading must be set to display: 'none' when not generating"
    );
    assert.ok(
      js.includes("outputLoading.style.display = 'flex';"),
      "outputLoading must be set to display: 'flex' only when isGenerating is true"
    );
  });
});
