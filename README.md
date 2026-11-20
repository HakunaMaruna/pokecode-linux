# PokeCode Linux

Linux (Ubuntu) port of the **PokeCode Android IDE**.

PokeCode is a professional Android IDE. This repository provides a Linux/Ubuntu
porting effort: a native launcher, Debian packaging and documentation so that
PokeCode can be installed and used on Ubuntu systems.

> PokeCode itself is proprietary. This project contains only the Linux porting
> glue, packaging and documentation; it does not redistribute PokeCode's
> proprietary source.

## Features

- `pokecode` command-line launcher
- Project workspace management (`pokecode new`, `pokecode run`)
- Debian/Ubuntu `.deb` package
- Desktop entry for application menus
- Installation and build documentation

## Download

- [.deb (v1.0.0)](https://github.com/HakunaMaruna/pokecode-linux/releases/download/v1.0.0/pokecode_1.0.0_all.deb)

## Download

- [.deb v2.0.0](https://github.com/HakunaMaruna/pokecode-linux/releases/download/v2.0.0/pokecode_2.0.0_all.deb)

## Quick start

```bash
# Build the .deb package
make deb

# Install on Ubuntu/Debian
sudo dpkg -i pokecode_1.0.0_all.deb
sudo apt-get install -f   # resolve dependencies if needed

# Run
pokecode
```

## Documentation

- [Installation](docs/INSTALL.md)
- [Building](docs/BUILD.md)
- [Porting notes](docs/PORTING.md)
- [User guide](docs/USER_GUIDE.md)

## License

The porting glue and packaging in this repository are released under the MIT
license. PokeCode and its components remain the property of their respective
owners.
EOF