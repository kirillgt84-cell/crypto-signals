"""Unit tests for portfolio_crypto encryption service."""
import pytest
import os


class TestPortfolioCrypto:
    """Tests for AES-256 encryption/decryption."""

    @pytest.fixture(autouse=True)
    def reset_fernet(self, monkeypatch):
        """Reset global fernet and set env key before each test."""
        monkeypatch.setenv("ENCRYPTION_KEY", "test_secret_key_for_unit_tests_only")
        # Force re-import to pick up the new env var
        import importlib
        import services.portfolio_crypto as pc
        importlib.reload(pc)
        # Reset global fernet cache
        pc._fernet = None
        self.encrypt = pc.encrypt
        self.decrypt = pc.decrypt

    def test_encrypt_decrypt_roundtrip(self):
        """Encrypt then decrypt should return original text."""
        plaintext = "my_api_key_12345"
        ciphertext = self.encrypt(plaintext)
        assert ciphertext != plaintext
        assert self.decrypt(ciphertext) == plaintext

    def test_encrypt_empty(self):
        """Empty string should return empty."""
        assert self.encrypt("") == ""
        assert self.decrypt("") == ""

    def test_different_plaintexts_produce_different_ciphertexts(self):
        """Different inputs should produce different outputs."""
        c1 = self.encrypt("key1")
        c2 = self.encrypt("key2")
        assert c1 != c2

    def test_decrypt_invalid_fails(self):
        """Decrypting garbage should raise an exception."""
        with pytest.raises(Exception):
            self.decrypt("not_valid_ciphertext!!!")
