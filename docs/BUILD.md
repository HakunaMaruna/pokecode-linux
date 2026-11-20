# Building

## Build the .deb package

```bash
make deb
```

This produces `pokecode_1.0.0_all.deb`.

## Manual build (without dpkg-deb)

```bash
make -n deb   # inspect
bash scripts/build-deb.sh build/deb/pokecode_1.0.0_all.deb  # see Makefile
```

Actually the Makefile handles the manual fallback automatically:

```bash
make deb
```

## Clean

```bash
make clean
```

## CI

GitHub Actions workflow `.github/workflows/build-deb.yml` builds the package on
every push.
EOF