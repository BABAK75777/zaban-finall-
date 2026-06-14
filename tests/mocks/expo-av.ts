let preparedRecording: MockRecording | null = null;

class MockRecording {
  id: number;
  static nextId = 1;

  constructor() {
    this.id = MockRecording.nextId++;
  }

  async prepareToRecordAsync(): Promise<void> {
    if (preparedRecording != null) {
      throw new Error('Only one Recording object can be prepared at a given time.');
    }
    preparedRecording = this;
    await delay(5);
  }

  async startAsync(): Promise<void> {
    await delay(2);
  }

  async stopAndUnloadAsync(): Promise<void> {
    if (preparedRecording === this) {
      preparedRecording = null;
    }
    await delay(2);
  }

  getURI(): string {
    return `file:///mock-recording-${this.id}.m4a`;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const Audio = {
  Recording: MockRecording,
  RecordingOptionsPresets: { HIGH_QUALITY: {} },
  setAudioModeAsync: async () => undefined,
};

export function __resetExpoAvMockForTests(): void {
  preparedRecording = null;
  MockRecording.nextId = 1;
}

export function __getPreparedRecordingForTests(): MockRecording | null {
  return preparedRecording;
}
