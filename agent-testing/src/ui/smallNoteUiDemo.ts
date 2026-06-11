import {
  runSmallNoteApiDemo,
} from '../api';
import {
  mapApiDemoToUiViewModel,
} from './uiMappers';
import type {
  AgentTestingDemoShellViewModel,
} from './uiTypes';

export function buildSmallNoteUiDemoViewModel(): AgentTestingDemoShellViewModel {
  const demo = runSmallNoteApiDemo();

  return mapApiDemoToUiViewModel(demo);
}
