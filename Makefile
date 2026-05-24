.PHONY: phonogram phonogram-test

phonogram:
	python3 scripts/phonogram/build_cmudict.py
	python3 scripts/phonogram/build_subtlex.py
	python3 scripts/phonogram/build_awl.py
	python3 scripts/phonogram/build_alignment.py

phonogram-test:
	python3 -m pytest scripts/phonogram/tests/
