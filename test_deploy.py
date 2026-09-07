import unittest
from unittest.mock import patch
from html.parser import HTMLParser
import subprocess
import deploy


class PageAssets(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.resources = []
        self.anchors = []

    def handle_starttag(self, tag, attributes):
        attributes = dict(attributes)
        if "id" in attributes:
            self.ids.append(attributes["id"])
        if tag in ("img", "script") and attributes.get("src"):
            self.resources.append(attributes["src"])
        if tag == "link" and attributes.get("rel") in ("stylesheet", "icon"):
            self.resources.append(attributes["href"])
        if tag == "a" and attributes.get("href", "").startswith("#"):
            self.anchors.append(attributes["href"][1:])


class PortfolioChecks(unittest.TestCase):
    def test_public_assets_and_anchors(self):
        page = PageAssets()
        page.feed((deploy.ROOT / "index.html").read_text(encoding="utf-8"))
        self.assertEqual(len(page.ids), len(set(page.ids)), "Duplicate HTML IDs")
        for resource in page.resources:
            self.assertNotIn("://", resource, "External page dependency")
            self.assertTrue((deploy.ROOT / resource).is_file(), resource)
        for target in page.anchors:
            self.assertIn(target, page.ids, "Broken anchor: " + target)
        for resource in [
            "assets/models/ave-duck.glb",
            "assets/vendor/loaders/GLTFLoader.js",
            "assets/vendor/utils/BufferGeometryUtils.js",
        ]:
            self.assertTrue((deploy.ROOT / resource).is_file(), resource)
        self.assertEqual((deploy.ROOT / "assets/models/ave-duck.glb").read_bytes()[:4], b"glTF")
        self.assertFalse((deploy.ROOT / "assets/projects").exists(), "Project screenshots must stay removed")
        deploy.check_assets()

    @patch("deploy.subprocess.check_output", return_value="already-staged.txt")
    @patch("deploy.run")
    def test_existing_staged_work_is_not_committed(self, run, output):
        with self.assertRaises(ValueError):
            deploy.push_git()
        run.assert_not_called()

    @patch("deploy.run", side_effect=subprocess.CalledProcessError(1, "ssh"))
    def test_failed_ssh_does_not_upload(self, run):
        with self.assertRaises(subprocess.CalledProcessError):
            deploy.deploy_vps()
        self.assertEqual(run.call_count, 1)

    @patch("deploy.run")
    def test_upload_includes_images_and_libraries(self, run):
        deploy.deploy_vps()
        upload = run.call_args_list[-1].args[0]
        self.assertEqual(upload[0], "scp")
        for resource in ["assets", "stickers_json", "style.css", "polish.css", "script.js", "duck.js"]:
            self.assertIn(resource, upload)
        self.assertIn("StrictHostKeyChecking=yes", upload)


if __name__ == "__main__":
    unittest.main()
