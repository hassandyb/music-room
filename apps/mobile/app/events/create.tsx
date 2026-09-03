import { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';

// Loaded lazily (only when a picker is actually opened), not as a top-level
// import: this native module isn't part of Expo Go's bundled module set, and
// expo-router needs to statically resolve every route file at startup - a
// top-level import here would crash the *entire* app in Expo Go the moment
// it launches, not just this screen. Deferring the require() until the user
// actually taps the field means everything else keeps working in Expo Go;
// only this one field degrades (see the catch below) until this runs in a
// custom dev client / full native build.
function loadDateTimePicker(): any {
  try {
    return require('@react-native-community/datetimepicker').default;
  } catch {
    return null;
  }
}

import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/form/themed-text-input';
import { ThemedButton } from '@/components/form/themed-button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as eventsApi from '@/lib/api/events';
import type { Licence, Privacy } from '@/lib/types';

const LICENCE_OPTIONS: { value: Licence; label: string }[] = [
  { value: 'FREE', label: 'Free' },
  { value: 'INVITE_ONLY', label: 'Invite Only' },
  { value: 'GEOTIME', label: 'Geo Time' },
];

// Same defaults as apps/web/app/(dashboard)/events/components/createEvent.tsx's
// DateTimePicker defaults: voting starts 5 min from now, ends 35 min from now.
const FIVE_MIN_MS = 5 * 60 * 1000;
const defaultStart = () => new Date(Date.now() + FIVE_MIN_MS);
const defaultEnd = () => new Date(Date.now() + 7 * FIVE_MIN_MS);

function LicenceSelect({ value, onChange }: { value: Licence; onChange: (v: Licence) => void }) {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];

  return (
    <View style={styles.segmentRow}>
      {LICENCE_OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              { borderColor: colors.border, backgroundColor: active ? colors.tint : colors.surface },
            ]}>
            <ThemedText type="defaultSemiBold" style={{ color: active ? '#fff' : colors.text, fontSize: 12 }}>
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

function DateTimeField({ label, value, onChange }: { label: string; value: Date; onChange: (d: Date) => void }) {
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];
  const [showDate, setShowDate] = useState(false);
  const [showTime, setShowTime] = useState(false);
  // Only touched once this field actually renders (i.e. GEOTIME is
  // selected) - see loadDateTimePicker's comment above for why this can't
  // be a top-level import.
  const RNDateTimePicker = useMemo(loadDateTimePicker, []);

  return (
    <View style={{ gap: 6 }}>
      <ThemedText style={[styles.hint, { color: colors.icon }]}>{label}</ThemedText>
      <Pressable
        onPress={() => setShowDate(true)}
        disabled={!RNDateTimePicker}
        style={[styles.dateButton, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <ThemedText>{value.toLocaleString()}</ThemedText>
      </Pressable>
      {!RNDateTimePicker ? (
        <ThemedText style={[styles.hint, { color: colors.icon }]}>
          Date/time picker isn&apos;t available in Expo Go - use a development build to set a custom time.
        </ThemedText>
      ) : null}
      {showDate && RNDateTimePicker ? (
        <RNDateTimePicker
          value={value}
          mode={Platform.OS === 'ios' ? 'datetime' : 'date'}
          onChange={(event: { type: string }, selected?: Date) => {
            setShowDate(false);
            if (event.type === 'dismissed' || !selected) return;
            onChange(selected);
            if (Platform.OS === 'android') setShowTime(true);
          }}
        />
      ) : null}
      {showTime && RNDateTimePicker ? (
        <RNDateTimePicker
          value={value}
          mode="time"
          onChange={(event: { type: string }, selected?: Date) => {
            setShowTime(false);
            if (event.type === 'dismissed' || !selected) return;
            onChange(selected);
          }}
        />
      ) : null}
    </View>
  );
}

export default function CreateEventScreen() {
  const queryClient = useQueryClient();
  const scheme = useColorScheme() ?? 'dark';
  const colors = Colors[scheme];

  const [title, setTitle] = useState('');
  const [privacy, setPrivacy] = useState<Privacy>('PUBLIC');
  const [licence, setLicence] = useState<Licence>('FREE');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [radius, setRadius] = useState('100');
  const [geoVotingStart, setGeoVotingStart] = useState<Date>(defaultStart);
  const [geoVotingEnd, setGeoVotingEnd] = useState<Date>(defaultEnd);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isGeoTime = licence === 'GEOTIME';

  const useMyLocation = async () => {
    setLocating(true);
    setError(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setError('Location access is needed to set the event location.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      setLatitude(position.coords.latitude.toString());
      setLongitude(position.coords.longitude.toString());
    } catch {
      setError('Could not get your current location.');
    } finally {
      setLocating(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Give the event a title.');
      return;
    }

    let geoFields: {
      latitude?: number;
      longitude?: number;
      radius?: number;
      geoVotingStart?: Date;
      geoVotingEnd?: Date;
    } = {};

    if (isGeoTime) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      const rad = parseFloat(radius);
      if (Number.isNaN(lat) || Number.isNaN(lng)) {
        setError('Set a location (use the button or type coordinates).');
        return;
      }
      if (Number.isNaN(rad) || rad <= 0) {
        setError('Set a valid radius in meters.');
        return;
      }
      const now = new Date();
      const fiveMinutesLater = new Date(now.getTime() + FIVE_MIN_MS);
      if (geoVotingStart < fiveMinutesLater) {
        setError('Voting start time must be at least 5 minutes from now.');
        return;
      }
      if (geoVotingEnd <= geoVotingStart) {
        setError('Voting end time must be after the start time.');
        return;
      }
      geoFields = { latitude: lat, longitude: lng, radius: rad, geoVotingStart, geoVotingEnd };
    }

    setError(null);
    setLoading(true);
    try {
      const event = await eventsApi.createEvent({
        title: title.trim(),
        privacy,
        licence,
        ...geoFields,
      });
      await queryClient.invalidateQueries({ queryKey: ['events'] });
      router.replace(`/events/${event.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create event.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={styles.heading}>
          Create Event
        </ThemedText>
        <ThemedText style={[styles.description, { color: colors.icon }]}>
          Fill in the details to create a new event
        </ThemedText>

        <ThemedText type="defaultSemiBold">Event Title</ThemedText>
        <ThemedTextInput placeholder="Enter event title" value={title} onChangeText={setTitle} />

        <ThemedText type="defaultSemiBold">Licence</ThemedText>
        <LicenceSelect value={licence} onChange={setLicence} />

        {isGeoTime ? (
          <>
            <ThemedText type="defaultSemiBold">Location</ThemedText>
            <ThemedButton title="Use my current location" onPress={useMyLocation} loading={locating} variant="secondary" />
            <View style={styles.row}>
              <ThemedTextInput
                placeholder="Latitude"
                value={latitude}
                onChangeText={setLatitude}
                keyboardType="numeric"
                style={styles.rowInput}
              />
              <ThemedTextInput
                placeholder="Longitude"
                value={longitude}
                onChangeText={setLongitude}
                keyboardType="numeric"
                style={styles.rowInput}
              />
            </View>
            <ThemedTextInput placeholder="Radius in meters" value={radius} onChangeText={setRadius} keyboardType="numeric" />

            <View style={styles.row}>
              <View style={styles.rowInput}>
                <DateTimeField label="Voting Start Time" value={geoVotingStart} onChange={setGeoVotingStart} />
              </View>
              <View style={styles.rowInput}>
                <DateTimeField label="Voting End Time" value={geoVotingEnd} onChange={setGeoVotingEnd} />
              </View>
            </View>
          </>
        ) : null}

        <View style={[styles.privacyRow, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={styles.privacyText}>
            <ThemedText type="defaultSemiBold">
              {privacy === 'PRIVATE' ? 'Private Event' : 'Public Event'}
            </ThemedText>
            <ThemedText style={[styles.hint, { color: colors.icon }]}>
              {privacy === 'PRIVATE' ? 'Only invited users can see this event' : 'Anyone can see this event'}
            </ThemedText>
          </View>
          <Switch
            value={privacy === 'PRIVATE'}
            onValueChange={(checked) => setPrivacy(checked ? 'PRIVATE' : 'PUBLIC')}
            trackColor={{ true: colors.tint, false: colors.border }}
            thumbColor="#fff"
          />
        </View>

        {error ? <ThemedText style={styles.error}>{error}</ThemedText> : null}

        <ThemedButton title="Create event" onPress={handleSubmit} loading={loading} />
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    padding: 24,
    gap: 12,
  },
  heading: {
    fontSize: 22,
  },
  description: {
    fontSize: 13,
    marginTop: -8,
    marginBottom: 4,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segment: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  rowInput: {
    flex: 1,
  },
  hint: {
    fontSize: 12,
  },
  dateButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    gap: 12,
  },
  privacyText: {
    flex: 1,
    gap: 2,
  },
  error: {
    color: '#ff4d4d',
  },
});
