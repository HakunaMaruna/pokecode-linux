# Porting notes

## Strategy

PokeCode is an Android application. Porting to Ubuntu uses two layers:

1. **Native launcher** (`pokecode`) providing a Linux-friendly CLI and workspace.
2. **Optional Android runtime** via Waydroid for running the original APK.

## Differences from Android

- Paths use standard Linux locations (`~/.pokecode`, `/usr/share/pokecode`).
- No Android permissions model; relies on normal Unix permissions.
- Terminal uses the host shell instead of the bundled proot environment.

## Package layout

```
/usr/bin/pokecode
/usr/share/applications/pokecode.desktop
/usr/share/doc/pokecode/
```

## Future work

- Integrate Waydroid launch automatically when the APK is present.
- Add a desktop GUI wrapper.
- Provide an APT repository.
EOF