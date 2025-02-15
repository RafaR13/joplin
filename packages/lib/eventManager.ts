const fastDeepEqual = require('fast-deep-equal');

const events = require('events');

export enum EventName {
	ResourceCreate = 'resourceCreate',
	ResourceChange = 'resourceChange',
	SettingsChange = 'settingsChange',
	TodoToggle = 'todoToggle',
	NoteTypeToggle = 'noteTypeToggle',
	SyncStart = 'syncStart',
	SessionEstablished = 'sessionEstablished',
	SyncComplete = 'syncComplete',
	ItemChange = 'itemChange',
	NoteAlarmTrigger = 'noteAlarmTrigger',
	AlarmChange = 'alarmChange',
	KeymapChange = 'keymapChange',
	NoteContentChange = 'noteContentChange',
	OcrServiceResourcesProcessed = 'ocrServiceResourcesProcessed',
	NoteResourceIndexed = 'noteResourceIndexed',
}

export class EventManager {

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private emitter_: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private appStatePrevious_: any;
	private appStateWatchedProps_: string[];
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private appStateListeners_: any;

	public constructor() {
		this.reset();
	}

	public reset() {
		this.emitter_ = new events.EventEmitter();

		this.appStatePrevious_ = {};
		this.appStateWatchedProps_ = [];
		this.appStateListeners_ = {};
	}

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public on(eventName: EventName, callback: Function) {
		return this.emitter_.on(eventName, callback);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public emit(eventName: EventName, object: any = null) {
		return this.emitter_.emit(eventName, object);
	}

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public removeListener(eventName: string, callback: Function) {
		return this.emitter_.removeListener(eventName, callback);
	}

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public off(eventName: EventName, callback: Function) {
		return this.removeListener(eventName, callback);
	}

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public filterOn(filterName: string, callback: Function) {
		return this.emitter_.on(`filter:${filterName}`, callback);
	}

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public filterOff(filterName: string, callback: Function) {
		return this.removeListener(`filter:${filterName}`, callback);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public async filterEmit(filterName: string, object: any) {
		let output = object;
		const listeners = this.emitter_.listeners(`filter:${filterName}`);
		for (const listener of listeners) {
			// When we pass the object to the plugin, it is always going to be
			// modified since it is serialized/unserialized. So we need to use a
			// deep equality check to see if it's been changed. Normally the
			// filter objects should be relatively small so there shouldn't be
			// much of a performance hit.
			const newOutput = await listener(output);

			// Plugin didn't return anything - so we leave the object as it is.
			if (newOutput === undefined) continue;

			if (!fastDeepEqual(newOutput, output)) {
				output = newOutput;
			}
		}

		return output;
	}

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public appStateOn(propName: string, callback: Function) {
		if (!this.appStateListeners_[propName]) {
			this.appStateListeners_[propName] = [];
			this.appStateWatchedProps_.push(propName);
		}

		this.appStateListeners_[propName].push(callback);
	}

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public appStateOff(propName: string, callback: Function) {
		if (!this.appStateListeners_[propName]) {
			throw new Error('EventManager: Trying to unregister a state prop watch for a non-watched prop (1)');
		}

		const idx = this.appStateListeners_[propName].indexOf(callback);
		if (idx < 0) throw new Error('EventManager: Trying to unregister a state prop watch for a non-watched prop (2)');

		this.appStateListeners_[propName].splice(idx, 1);
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	private stateValue_(state: any, propName: string) {
		const parts = propName.split('.');
		let s = state;
		for (const p of parts) {
			if (!(p in s)) throw new Error(`Invalid state property path: ${propName}`);
			s = s[p];
		}
		return s;
	}

	// This function works by keeping a copy of the watched props and, whenever this function
	// is called, comparing the previous and new values and emitting events if they have changed.
	// The appStateEmit function should be called from a middleware.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public appStateEmit(state: any) {
		if (!this.appStateWatchedProps_.length) return;

		for (const propName of this.appStateWatchedProps_) {
			let emit = false;

			const stateValue = this.stateValue_(state, propName);

			if (!(propName in this.appStatePrevious_) || this.appStatePrevious_[propName] !== stateValue) {
				this.appStatePrevious_[propName] = stateValue;
				emit = true;
			}

			if (emit) {
				const listeners = this.appStateListeners_[propName];
				if (!listeners || !listeners.length) continue;

				const eventValue = Object.freeze(stateValue);
				for (const listener of listeners) {
					listener({ value: eventValue });
				}
			}
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Old code before rule was applied
	public once(eventName: string, callback: any) {
		return this.emitter_.once(eventName, callback);
	}

}

const eventManager = new EventManager();

export default eventManager;
