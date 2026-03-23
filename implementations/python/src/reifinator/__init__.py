"""Reifinator — template-structure-driven code and directory generator."""

__version__ = "0.1.0"

from reifinator.generator import Generator
from reifinator.content import BaseContentGenerator, BuiltinInterpolator
from reifinator.output import Content
from reifinator.resolution import UnresolvedExpressionsError

__all__ = [
    "Generator",
    "BaseContentGenerator",
    "BuiltinInterpolator",
    "Content",
    "UnresolvedExpressionsError",
]
