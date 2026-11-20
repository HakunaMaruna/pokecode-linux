PACKAGE := pokecode
VERSION := 2.1.1
ARCH := all
DEB := $(PACKAGE)_$(VERSION)_$(ARCH).deb
BUILD_DIR := build/app

.PHONY: all clean deb release

all: deb

deb: $(DEB)

$(DEB): $(BUILD_DIR)
	if command -v dpkg-deb >/dev/null 2>&1; then \
		dpkg-deb --build $(BUILD_DIR) $(DEB); \
	else \
		bash scripts/build-deb.sh $(BUILD_DIR) $(DEB); \
	fi

$(BUILD_DIR):
	rm -rf $(BUILD_DIR)
	mkdir -p $(BUILD_DIR)/DEBIAN
	mkdir -p $(BUILD_DIR)/usr/bin
	mkdir -p $(BUILD_DIR)/usr/share/applications
	mkdir -p $(BUILD_DIR)/usr/share/doc/$(PACKAGE)
	mkdir -p $(BUILD_DIR)/opt/$(PACKAGE)
	cp -r bin package.json lib web scripts $(BUILD_DIR)/opt/$(PACKAGE)/
	mkdir -p $(BUILD_DIR)/usr/bin
	cp bin/pokecode $(BUILD_DIR)/usr/bin/pokecode
	[ -d node_modules ] && cp -r node_modules $(BUILD_DIR)/opt/$(PACKAGE)/ && rm -rf $(BUILD_DIR)/opt/$(PACKAGE)/node_modules/ssh2/test || true
	mkdir -p $(BUILD_DIR)/opt/$(PACKAGE)/docs
	cp packaging/debian/control $(BUILD_DIR)/DEBIAN/control
	cp packaging/debian/postinst $(BUILD_DIR)/DEBIAN/postinst
	cp packaging/debian/prerm $(BUILD_DIR)/DEBIAN/prerm
	chmod 755 $(BUILD_DIR)/usr/bin/pokecode $(BUILD_DIR)/opt/$(PACKAGE)/bin/pokecode
	cp packaging/debian/pokecode.desktop $(BUILD_DIR)/usr/share/applications/pokecode.desktop
	cp README.md LICENSE $(BUILD_DIR)/opt/$(PACKAGE)/
	cp docs/INSTALL.md docs/USER_GUIDE.md docs/PORTING.md $(BUILD_DIR)/opt/$(PACKAGE)/docs/

clean:
	rm -rf build $(DEB)
