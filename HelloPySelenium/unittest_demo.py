import unittest


class UnittestDemo(unittest.TestCase):
    def setUp(self):
        print("setUp()")

    def tearDown(self):
        print("tearDown")

    def test_01(self):
        print("test_01()")

    def test_03(self):
        print("test_03()")

    def test_02(self):
        print("test_02()")

    def test_05(self):
        print("test_05()")

    def test_04(self):
        print("test_04()")
