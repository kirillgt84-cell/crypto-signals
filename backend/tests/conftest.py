"""Pytest config: disable slowapi rate limiting for all tests."""
import slowapi
slowapi._original_limiter_limit = slowapi.Limiter.limit
slowapi.Limiter.limit = lambda self, *args, **kwargs: lambda f: f
