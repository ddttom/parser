import { jest } from '@jest/globals';
import { createStateManager, ActionTypes, actions, selectors } from '../src/services/state-manager.js';

describe('StateManager', () => {
    let stateManager;

    beforeEach(() => {
        stateManager = createStateManager();
    });

    describe('Basic State Operations', () => {
        test('should initialize with default state', () => {
            const state = stateManager.getState();
            expect(state).toHaveProperty('ui');
            expect(state).toHaveProperty('parser');
            expect(state).toHaveProperty('settings');
            expect(state).toHaveProperty('entries');
        });

        test('should update state immutably', () => {
            const initialState = stateManager.getState();
            stateManager.setState({ settings: { theme: 'dark' } });
            
            const newState = stateManager.getState();
            expect(newState).not.toBe(initialState);
            expect(newState.settings.theme).toBe('dark');
        });

        test('should notify listeners of state changes', () => {
            const listener = jest.fn();
            stateManager.subscribe(listener);
            
            stateManager.setState({ settings: { theme: 'dark' } });
            
            expect(listener).toHaveBeenCalledWith(
                expect.any(Object),
                expect.any(Object)
            );
        });

        test('should allow unsubscribing listeners', () => {
            const listener = jest.fn();
            const unsubscribe = stateManager.subscribe(listener);
            
            unsubscribe();
            stateManager.setState({ settings: { theme: 'dark' } });
            
            expect(listener).not.toHaveBeenCalled();
        });
    });

    describe('Action Dispatching', () => {
        test('should handle SET_MODAL action', () => {
            stateManager.dispatch(actions.setModal('settings'));
            expect(selectors.getActiveModal(stateManager.getState())).toBe('settings');
        });

        test('should handle SET_THEME action', () => {
            stateManager.dispatch(actions.setTheme('dark'));
            expect(selectors.getCurrentTheme(stateManager.getState())).toBe('dark');
        });

        test('should handle SET_EDITOR_STATE action', () => {
            const editorState = { content: 'test content', selection: { start: 0, end: 4 } };
            stateManager.dispatch(actions.setEditorState(editorState));
            expect(selectors.getEditorState(stateManager.getState())).toEqual(
                expect.objectContaining(editorState)
            );
        });

        test('should handle SET_PARSER_RESULTS action', () => {
            const results = [{ type: 'date', value: '2024-01-01' }];
            stateManager.dispatch(actions.setParserResults(results));
            expect(selectors.getParserResults(stateManager.getState())).toEqual(results);
        });

        test('should handle UPDATE_PARSER_STATS action', () => {
            const stats = { totalProcessed: 10, averageConfidence: 0.85 };
            stateManager.dispatch(actions.updateParserStats(stats));
            expect(selectors.getParserStats(stateManager.getState())).toEqual(
                expect.objectContaining(stats)
            );
        });

        test('should handle entry-related actions', () => {
            const entries = [
                { id: 1, content: 'Entry 1' },
                { id: 2, content: 'Entry 2' }
            ];

            // Test SET_ENTRIES
            stateManager.dispatch(actions.setEntries(entries));
            expect(selectors.getEntries(stateManager.getState())).toEqual(entries);

            // Test UPDATE_ENTRY
            const updatedEntry = { id: 1, content: 'Updated Entry 1' };
            stateManager.dispatch(actions.updateEntry(updatedEntry));
            expect(selectors.getEntryById(stateManager.getState(), 1)).toEqual(updatedEntry);

            // Test DELETE_ENTRY
            stateManager.dispatch(actions.deleteEntry(1));
            expect(selectors.getEntries(stateManager.getState())).toHaveLength(1);
            expect(selectors.getEntryById(stateManager.getState(), 1)).toBeUndefined();
        });
    });

    describe('State Validation', () => {
        test('should throw error for missing required properties', () => {
            expect(() => {
                stateManager.setState({ ui: undefined });
            }).toThrow('Missing required state property: ui');
        });

        test('should throw error for invalid theme type', () => {
            expect(() => {
                stateManager.setState({ ui: { theme: 123 } });
            }).toThrow('Theme must be a string');
        });

        test('should throw error for invalid parser results', () => {
            expect(() => {
                stateManager.setState({ parser: { results: 'not an array' } });
            }).toThrow('Parser results must be an array');
        });

        test('should throw error for invalid entries list', () => {
            expect(() => {
                stateManager.setState({ entries: { list: 'not an array' } });
            }).toThrow('Entries list must be an array');
        });
    });

    describe('Error Handling', () => {
        test('should handle errors in reducers', () => {
            const invalidAction = { type: ActionTypes.SET_THEME, payload: 123 };
            stateManager.dispatch(invalidAction);
            
            const error = selectors.getError(stateManager.getState());
            expect(error).toBeTruthy();
            expect(error.action).toBe(ActionTypes.SET_THEME);
        });

        test('should handle errors in listeners', () => {
            const errorListener = () => {
                throw new Error('Listener error');
            };
            stateManager.subscribe(errorListener);
            
            // Should not throw
            expect(() => {
                stateManager.setState({ settings: { theme: 'dark' } });
            }).not.toThrow();
        });
    });

    describe('Reset Functionality', () => {
        test('should reset state to initial values', () => {
            stateManager.dispatch(actions.setTheme('dark'));
            stateManager.dispatch(actions.setModal('settings'));
            
            stateManager.reset();
            
            const state = stateManager.getState();
            expect(state).toEqual(expect.objectContaining({
                ui: expect.objectContaining({
                    theme: 'light',
                    activeModal: null
                })
            }));
        });
    });
});
