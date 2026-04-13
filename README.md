# hw_filestorage

# Doubts

## Implementation Doubts & Resolutions

This document records design decisions made during implementation to resolve ambiguities in the requirements.

---

### File Identifier Uniqueness Scope

**Doubt**: Are file identifiers required to be globally unique, or only unique within their `type`?

**Assumption**: File identifiers are unique **per-type**. The same ID can exist in different types (e.g., ID `"invoice-2024-001"` can exist in both `type: "unpaid"` and `type: "archived"`).

**Impact**:

- Cache key format becomes `file:{type}:{id}` (composite).
- The API does not enforce global uniqueness.
- Clients must include the `type` parameter in all operations.

---

# TODOs

### Interface for configuration can be helpfull

**TODO-1**: IInterface for configuration can be helpfull

---