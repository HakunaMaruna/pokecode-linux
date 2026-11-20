# Installation

## Requirements

- Ubuntu 22.04+ or Debian 12+
- `bash`, `coreutils`
- Optional: `waydroid` for running the original Android APK

## Install from .deb

```bash
sudo dpkg -i pokecode_1.0.0_all.deb
sudo apt-get install -f
```

## Verify

```bash
pokecode version
pokecode help
```

## Uninstall

```bash
sudo apt-get remove pokecode
# or
sudo dpkg -r pokecode
```

## Running the original PokeCode APK on Linux

This port can launch the original PokeCode Android IDE through Waydroid:

```bash
sudo apt install waydroid
waydroid init
# download the PokeCode APK from the upstream release page
waydroid app install PokeCode.apk
pokecode  # uses waydroid when available
```
EOF