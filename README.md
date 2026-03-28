# Dad Band Bass

Dad Band Bass is an Expo / React Native app for keeping bass charts tidy, readable, and easy to use at rehearsal or on stage.

The current free version is built around one simple workflow:

- keep a local tab library
- edit songs with the fast tab editor
- maintain one fixed setlist called `Setlist`
- open a performance view for stage reading
- export song and setlist PDFs

Import and other extras are positioned as future `Dad Band Bass Plus` features.

## Stack

- Expo
- React Native
- TypeScript
- React Navigation
- AsyncStorage

## Current App Flow

The main app currently includes:

- `Library`: local song list, state save/restore, and song creation
- `Song Editor`: metadata editing plus the fast tab editor
- `Setlist`: single free-version setlist flow
- `Performance View`: dark stage-reading view
- `About`: branded welcome / product screen

## Editing Model

Bass tab is stored as text and transformed for editing:

1. tab text is parsed into bars and cells
2. the editor updates those bars and cells
3. the chart is rendered back into tab text

Key files:

- [src/components/SectionEditorCard.tsx](/home/rob/BassTab/src/components/SectionEditorCard.tsx)
- [src/utils/tabLayout.ts](/home/rob/BassTab/src/utils/tabLayout.ts)
- [src/utils/songChart.ts](/home/rob/BassTab/src/utils/songChart.ts)

The mobile editor now uses a simpler interaction model:

- select one bar at a time
- tap a cell to target it
- enter fret values using fret buttons instead of typing into tiny inputs

## Local Data

App data is stored locally with AsyncStorage.

That means:

- songs survive reloads on the same device
- the setlist survives reloads on the same device
- there is no backend sync yet

State save/restore is still local-device behavior, not cloud backup.

## Development

Install dependencies:

```sh
npm install
```

Start the app:

```sh
npm start
```

Useful targets:

```sh
npm run web
npm run android
npm run ios
```

## Validation

Type-check the project:

```sh
npm run typecheck
```

Export the web build:

```sh
npm run export:web
```

Run the Linux-friendly validation flow:

```sh
npm run verify:linux
```

`verify:linux` runs:

- `tsc --noEmit`
- `expo export --platform web`

## Repo Notes

- `assets/bass.png` is used in the branded welcome/about experience
- the welcome screen is also the in-app `About` screen
- the free version deliberately keeps the setlist title fixed as `Setlist`

## Build Notes

This is still an Expo-managed app. For hosted iOS builds, use EAS once app identifiers and release metadata are ready.
