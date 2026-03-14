# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.3.x (current) | ✅ |
| 0.2.x | ❌ |
| 0.1.x | ❌ |

## Reporting a Vulnerability

If you discover a security vulnerability in RestaRules, please report it responsibly.

**How to report:**
- Open a [GitHub Security Advisory](https://github.com/selfradiance/restarules/security/advisories/new) (preferred — private by default)
- Or email: selfradiance@gmail.com

**What to include:**
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

**What to expect:**
- Acknowledgment within 72 hours
- Assessment and response within 14 days
- Credit in the fix commit (unless you prefer anonymity)

## Scope

This policy covers the RestaRules schema, specification, SDK (`restarules-sdk`), CLI, reference agent, and demo code in this repository.

The reference agent and browser demo are **local/demo tooling** and are not designed for production server-side deployment. Security findings specific to server-side use of demo tooling are appreciated but will be triaged as low priority.

## Not in Scope

- Theoretical attacks that require the attacker to already have write access to the venue's rules file
- Issues in third-party dependencies (report these upstream)
