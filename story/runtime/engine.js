export const SAVE_KEY = 'pinn.readers-record.story.v1';

export class StorySession {
  constructor(campaign, saved = null) {
    this.campaign = campaign;
    this.history = [];
    this.line = 0;
    this.pending = null;
    this.recovered = false;
    this.state = this.initialState();
    if (saved != null) this.restore(saved);
  }
  initialState() {
    return {flags: {dokja_body: 'alive', selection_settled: false}, items: {
      'phone-original': {status: 'recorded', first: 'ST001'},
      'novel-text': {status: 'recorded', first: 'ST001'}
    }, stories: []};
  }
  get index() { return this.history.length; }
  get finished() { return this.index === this.campaign.scenes.length; }
  get scene() { return this.campaign.scenes[this.index] || null; }
  get ready() { return !!this.scene && this.line === this.scene.lines.length - 1; }
  check(scene) {
    return Object.entries(scene.requires || {}).every(([key, value]) => this.state.flags[key] === value);
  }
  apply(scene) {
    const effect = scene.effects || {};
    Object.assign(this.state.flags, effect.set || {});
    for (const id of effect.grant || []) this.state.items[id] = {status: 'recorded', first: scene.id};
    for (const id of effect.consume || []) {
      this.state.items[id] = {...this.state.items[id], status: 'used', at: scene.id};
    }
    for (const name of effect.stories || []) if (!this.state.stories.includes(name)) this.state.stories.push(name);
  }
  nextLine() {
    if (!this.scene || this.pending) return false;
    if (!this.ready) { this.line++; return true; }
    return false;
  }
  previousLine() {
    if (this.pending || this.line === 0) return false;
    this.line--; return true;
  }
  choose(id) {
    if (!this.ready || !this.check(this.scene)) return null;
    const choice = this.scene.choices.find(c => c.id === id);
    if (!choice) return null;
    if (choice.kind === 'advance') this.pending = {scene: this.scene.id, choice: id};
    return choice;
  }
  commit() {
    if (this.replayLimit != null && this.index >= this.replayLimit) return false;
    if (!this.scene || !this.pending || this.pending.scene !== this.scene.id) return false;
    const scene = this.scene;
    if (!this.check(scene)) return false;
    const id = this.pending.choice;
    if (!scene.choices.some(c => c.id === id && c.kind === 'advance')) return false;
    this.apply(scene);
    this.history.push(id);
    this.line = 0;
    this.pending = null;
    return true;
  }
  save() { return {schema: 1, choices: [...this.history], line: this.line}; }
  restore(saved) {
    if (saved.schema !== 1 || !Array.isArray(saved.choices)) { this.recovered = true; return; }
    // Rebuild canonical state from completed choices; never trust saved flags or a saved stage index.
    for (const id of saved.choices.slice(0, this.campaign.scenes.length)) {
      const scene = this.scene;
      if (!scene || !this.check(scene) || !scene.choices.some(c => c.id === id && c.kind === 'advance')) {this.recovered = true; break;}
      this.apply(scene);
      this.history.push(id);
    }
    if (saved.choices.length > this.campaign.scenes.length) this.recovered = true;
    if (this.scene) this.line = Math.min(this.scene.lines.length - 1, Math.max(0, Number.isInteger(saved.line) ? saved.line : 0));
  }
  replay(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.campaign.scenes.length || index > this.index) return null;
    const session = new StorySession(this.campaign, {schema: 1, choices: this.history.slice(0, index), line: 0});
    session.replayLimit = this.index;
    return session;
  }
}
