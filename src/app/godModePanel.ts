export type GodModeState = {
  panelVisible: boolean;
  rapidFireEnabled: boolean;
  rapidFireHz: number;
};

export type GodModePanelController = {
  setVisible: (visible: boolean) => void;
  destroy: () => void;
};

type CreateGodModePanelOptions = {
  initialState: GodModeState;
  onStateChange: (nextState: GodModeState) => void;
};

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

export const createGodModePanel = (
  options: CreateGodModePanelOptions
): GodModePanelController => {
  let state = {
    ...options.initialState,
    rapidFireHz: clamp(options.initialState.rapidFireHz, 5, 60)
  };

  const panel = document.createElement('aside');
  panel.className = 'god-mode-panel';

  const title = document.createElement('h2');
  title.className = 'god-mode-title';
  title.textContent = 'God Mode';

  const rapidFireRow = document.createElement('label');
  rapidFireRow.className = 'god-mode-row';

  const rapidFireCheckbox = document.createElement('input');
  rapidFireCheckbox.type = 'checkbox';
  rapidFireCheckbox.checked = state.rapidFireEnabled;

  const rapidFireText = document.createElement('span');
  rapidFireText.textContent = '高速连点';

  rapidFireRow.append(rapidFireCheckbox, rapidFireText);

  const frequencyWrap = document.createElement('div');
  frequencyWrap.className = 'god-mode-frequency';

  const frequencyLabel = document.createElement('label');
  frequencyLabel.className = 'god-mode-frequency-label';
  frequencyLabel.textContent = '连点频率';

  const frequencyValue = document.createElement('span');
  frequencyValue.className = 'god-mode-frequency-value';

  const frequencySlider = document.createElement('input');
  frequencySlider.type = 'range';
  frequencySlider.min = '5';
  frequencySlider.max = '60';
  frequencySlider.step = '1';
  frequencySlider.value = String(state.rapidFireHz);

  const updateFrequencyValue = () => {
    frequencyValue.textContent = `${state.rapidFireHz} Hz`;
  };

  const emitState = () => {
    options.onStateChange({ ...state });
  };

  rapidFireCheckbox.addEventListener('change', () => {
    state = {
      ...state,
      rapidFireEnabled: rapidFireCheckbox.checked
    };
    emitState();
  });

  frequencySlider.addEventListener('input', () => {
    state = {
      ...state,
      rapidFireHz: clamp(Number(frequencySlider.value), 5, 60)
    };
    updateFrequencyValue();
    emitState();
  });

  frequencyWrap.append(frequencyLabel, frequencyValue, frequencySlider);
  panel.append(title, rapidFireRow, frequencyWrap);
  document.body.append(panel);

  const setVisible = (visible: boolean) => {
    state = {
      ...state,
      panelVisible: visible
    };
    panel.classList.toggle('is-visible', visible);
    emitState();
  };

  updateFrequencyValue();
  setVisible(state.panelVisible);

  return {
    setVisible,
    destroy: () => {
      panel.remove();
    }
  };
};
