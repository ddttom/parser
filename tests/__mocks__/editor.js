import { jest } from '@jest/globals';

const mockEditor = {
  root: { innerHTML: '' },
  getSelection: jest.fn(() => ({ index: 0 })),
  insertEmbed: jest.fn(),
  getText: jest.fn().mockReturnValue('Test content'),
  focus: jest.fn(),
  setContents: jest.fn(),
  getContents: jest.fn().mockReturnValue({
    text: 'Test content',
    html: '<p>Test content</p>'
  }),
  clipboard: {
    dangerouslyPasteHTML: jest.fn()
  }
};

class Editor {
  constructor(container) {
    this.editor = {
      ...mockEditor,
      root: container?.querySelector('#editor') || { innerHTML: '' }
    };
    Object.assign(this, this.editor);
  }

  async handleImageButton() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.click();
    return new Promise((resolve) => {
      input.onchange = (event) => resolve(event.target.files);
    });
  }

  async handleImageUpload(event, currentEntryId, ipcRenderer) {
    const file = event.target.files[0];
    const buffer = await file.arrayBuffer();
    const imageInfo = await ipcRenderer.invoke('add-image', currentEntryId, buffer, file.name);
    this.editor.insertEmbed(0, 'image', imageInfo.path);
  }

  focus() {
    this.editor.focus();
  }

  setContents(content) {
    if (typeof content === 'string') {
      this.editor.root.innerHTML = content;
    } else {
      this.editor.setContents([]);
    }
  }

  getContents() {
    return {
      text: this.getText(),
      html: this.editor.root.innerHTML
    };
  }

  getText() {
    return this.editor.getText() || '';
  }

  insertEmbed(index, type, url) {
    this.editor.insertEmbed(index, type, url);
  }

  get root() {
    return this.editor.root;
  }
}

// Export mock functions for testing
export const __mockEditor = mockEditor;

// Export Editor class as default
export default Editor;
