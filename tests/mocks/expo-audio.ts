import type { RecordingInput } from 'expo-audio';

let preparedRecording: MockAudioRecorder | null = null;
let availableInputs: RecordingInput[] = [
  {
    uid: 'builtin-1',
    name: 'Phone Microphone',
    type: 'MicrophoneBuiltIn',
  },
];
let selectedInputUid: string | null = null;
let setAudioModeCallCount = 0;

class MockAudioRecorder {
  id: number;
  uri: string | null = null;
  static nextId = 1;

  constructor(_options?: unknown) {
    this.id = MockAudioRecorder.nextId++;
  }

  async prepareToRecordAsync(): Promise<void> {
    if (preparedRecording != null) {
      throw new Error('Only one Recording object can be prepared at a given time.');
    }
    preparedRecording = this;
    await delay(5);
  }

  getAvailableInputs(): RecordingInput[] {
    return availableInputs;
  }

  async getCurrentInput(): Promise<RecordingInput> {
    const current =
      availableInputs.find((input) => input.uid === selectedInputUid) ??
      availableInputs[0];
    if (!current) {
      throw new Error('No input');
    }
    return current;
  }

  setInput(inputUid: string): void {
    const match = availableInputs.find((input) => input.uid === inputUid);
    if (!match) {
      throw new Error(`Preferred input '${inputUid}' not found!`);
    }
    selectedInputUid = inputUid;
  }

  record(): void {
    /* start */
  }

  async stop(): Promise<void> {
    if (preparedRecording === this) {
      preparedRecording = null;
    }
    this.uri = `file:///mock-recording-${this.id}.m4a`;
    await delay(2);
  }

  remove(): void {
    if (preparedRecording === this) {
      preparedRecording = null;
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const RecordingPresets = {
  HIGH_QUALITY: { extension: '.m4a' },
  LOW_QUALITY: { extension: '.m4a' },
};

export async function setAudioModeAsync(): Promise<void> {
  setAudioModeCallCount += 1;
}

export async function getRecordingPermissionsAsync() {
  return { granted: true, canAskAgain: true, status: 'granted' };
}

export async function requestRecordingPermissionsAsync() {
  return { granted: true, canAskAgain: true, status: 'granted' };
}

export const AudioModule = {
  AudioRecorder: MockAudioRecorder,
};

export function createAudioPlayer() {
  throw new Error('createAudioPlayer mock not implemented for this test suite');
}

export function __resetExpoAudioMockForTests(): void {
  preparedRecording = null;
  MockAudioRecorder.nextId = 1;
  availableInputs = [
    {
      uid: 'builtin-1',
      name: 'Phone Microphone',
      type: 'MicrophoneBuiltIn',
    },
  ];
  selectedInputUid = null;
  setAudioModeCallCount = 0;
}

/** @deprecated Prefer __resetExpoAudioMockForTests */
export function __resetExpoAvMockForTests(): void {
  __resetExpoAudioMockForTests();
}

export function __getPreparedRecordingForTests(): MockAudioRecorder | null {
  return preparedRecording;
}

export function __setAvailableInputsForTests(inputs: RecordingInput[]): void {
  availableInputs = inputs;
}

export function __getSelectedInputUidForTests(): string | null {
  return selectedInputUid;
}

export function __getSetAudioModeCallCountForTests(): number {
  return setAudioModeCallCount;
}
