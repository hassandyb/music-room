import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { EventData, EventMember, EventTrack, Track, UserWithProfile } from '@repo/types';



interface EventState {
    data: EventData | null;
    isConnected: boolean;
    isJoined: boolean;
    searchResults: Track[];
    isSearching: boolean;
    error: string | null;
}

const initialState: EventState = {
    data: null,
    isConnected: false,
    isJoined: false,
    searchResults: [],
    isSearching: false,
    error: null,
};

export const eventSlice = createSlice({
    name: 'event',
    initialState,
    reducers: {
        // Called once on mount with SSR-fetched data
        hydrateEvent(state, action: PayloadAction<EventData>) {
            state.data = action.payload;
        },

        // Socket connection lifecycle
        socketConnected(state) {
            state.isConnected = true;
        },
        socketDisconnected(state) {
            state.isConnected = false;
            state.isJoined = false;
        },
        roomJoined(state) {
            state.isJoined = true;
        },

        // Real-time updates pushed from the server
        eventDetailsUpdated(state, action: PayloadAction<EventData>) {
            state.data = { ...state.data, ...action.payload };
        },
        eventTracksUpdated(state, action: PayloadAction<{ track: EventTrack }>) {
            if (state.data) {
                state.data = { ...state.data, tracks: [action.payload.track, ...(state.data?.tracks || [])] }
            }
        },
        eventUpdateTrack(state, action: PayloadAction<EventTrack>) {
            if (state.data) {
                const tracks = state.data.tracks || [];
                const filteredTracks = tracks.filter(t => t.trackId != action.payload.trackId);
                state.data = { ...state.data, tracks: [...filteredTracks, action.payload] }
            }
        },
        memberJoined(state, action: PayloadAction<EventMember>) {
            if (state.data) {
                state.data.members.push(action.payload);
            }
        },
        memberLeft(state, action: PayloadAction<{ userId: string }>) {

        },

        // Search
        searchStarted(state) {
            state.isSearching = true;
        },
        searchResultsReceived(state, action: PayloadAction<Track[]>) {
            state.searchResults = action.payload;
            state.isSearching = false;
        },

        socketError(state, action: PayloadAction<string>) {
            state.error = action.payload;
        },
        clearError(state) {
            state.error = null;
        },

        resetEvent() {
            return initialState;
        },
    },
});

export const {
    hydrateEvent,
    socketConnected,
    socketDisconnected,
    roomJoined,
    eventDetailsUpdated,
    eventTracksUpdated,
    eventUpdateTrack,
    memberJoined,
    memberLeft,
    searchStarted,
    searchResultsReceived,
    socketError,
    clearError,
    resetEvent,
} = eventSlice.actions;

export default eventSlice.reducer;