PACKAGE := pokecode
VERSION := 2.0.0
ARCH := all
DEB := $(PACKAGE)_$(VERSION)_$(ARCH).deb
BUILD_DIR := build/deb

.PHONY: all clean deb

all: deb

deb:
	rm -rf $(BUILD_DIR)
	mkdir -p $(BUILD_DIR)/DEBIAN
	mkdir -p $(BUILD_DIR)/usr/bin
	mkdir -p $(BUILD_DIR)/usr/share/applications
	mkdir -p $(BUILD_DIR)/usr/share/pokecode/web
	mkdir -p $(BUILD_DIR)/usr/share/pokecode/lib
	mkdir -p $(BUILD_DIR)/usr/share/doc/$(PACKAGE)
	cp src/pokecode $(BUILD_DIR)/usr/bin/pokecode
	chmod 755 $(BUILD_DIR)/usr/bin/pokecode
	cp packaging/debian/control $(BUILD_DIR)/DEBIAN/control
	cp packaging/debian/postinst $(BUILD_DIR)/DEBIAN/postinst
	cp packaging/debian/prerm $(BUILD_DIR)/DEBIAN/prerm
	chmod 755 $(BUILD_DIR)/DEBIAN/postinst $(BUILD_DIR)/DEBIAN/prerm
	cp packaging/debian/pokecode.desktop $(BUILD_DIR)/usr/share/applications/pokecode.desktop
	cp web/index.html $(BUILD_DIR)/usr/share/pokecode/web/index.html
	cp lib/server.py $(BUILD_DIR)/usr/share/pokecode/lib/server.py
	chmod 755 $(BUILD_DIR)/usr/share/pokecode/lib/server.py
	cp README.md $(BUILD_DIR)/usr/share/doc/$(PACKAGE)/README.md
	if command -v dpkg-deb >/dev/null 2>&1; then \
		dpkg-deb --build $(BUILD_DIR) $(DEB); \
	else \
		bash scripts/build-deb.sh $(BUILD_DIR) $(DEB); \
	fi

<<<<<<< HEAD
=======
$(BUILD_DIR):
	rm -rf $(BUILD_DIR)
	mkdir -p $(BUILD_DIR)/DEBIAN
	mkdir -p $(BUILD_DIR)/usr/bin
	mkdir -p $(BUILD_DIR)/usr/share/applications
	mkdir -p $(BUILD_DIR)/usr/share/doc/$(PACKAGE)
	mkdir -p $(BUILD_DIR)/opt/$(PACKAGE)
	cp -r bin $(BUILD_DIR)/opt/$(PACKAGE)/
	mkdir -p $(BUILD_DIR)/usr/bin
	cp bin/pokecode $(BUILD_DIR)/usr/bin/pokecode
	[ -d node_modules ] && cp -r node_modules $(BUILD_DIR)/opt/$(PACKAGE)/ && rm -rf $(BUILD_DIR)/opt/$(PACKAGE)/node_modules/ssh2/test $(BUILD_DIR)/opt/$(PACKAGE)/node_modules/ssh2/test || true
	cp -r package.json bin lib web scripts $(BUILD_DIR)/opt/$(PACKAGE)/
	cp packaging/debian/control $(BUILD_DIR)/DEBIAN/control
	cp packaging/debian/postinst $(BUILD_DIR)/DEBIAN/postinst
	cp packaging/debian/prerm $(BUILD_DIR)/DEBIAN/prerm
	chmod 755 $(BUILD_DIR)/usr/bin/pokecode $(BUILD_DIR)/opt/$(PACKAGE)/bin/pokecode
	chmod 755 $(BUILD_DIR)/DEBIAN/postinst $(BUILD_DIR)/DEBIAN/prerm
	cp packaging/debian/pokecode.desktop $(BUILD_DIR)/usr/share/applications/pokecode.desktop
	cp README.md LICENSE $(BUILD_DIR)/opt/$(PACKAGE)/
	cp docs/INSTALL.md docs/USER_GUIDE.md $(BUILD_DIR)/opt/$(PACKAGE)/docs/ 2>/dev/null || true

release: deb
	TOKEN=$$(sed 's#https://x-access-token:\(.*\)@github.com#\1#' /root/.git-credentials)
	RELEASE_ID=$$(curl -s -X POST -H "Authorization: token $$TOKEN" -H "Content-Type: application/json" -d '{"tag_name":"v$(VERSION)","name":"PokeCode IDE v$(VERSION)"}' https://api.github.com/repos/HakunaMaruna/pokecode-linux/releases | grep -oE '"id":[0-9]+' | head -1 | cut -d: -f2)
	curl -s -X POST -H "Authorization: token $$TOKEN" -H "Content-Type: application/vnd.debian.binary-package" --data-binary @$(DEB) "https://uploads.github.com/repos/HakunaMaruna/pokecode-linux/releases/$$RELEASE_ID/assets?name=$(DEB)" -o /dev/null -w "Uploaded %{http_code}\n"

>>>>>>> 74c5bf4 (v2.1.0 full IDE (no test fixtures))
clean:
	rm -rf build $(DEB)
