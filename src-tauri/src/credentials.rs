//! API key storage.
//!
//! The key used to sit in `alarmer.json` next to the alarms, which meant the
//! app's own "export a backup" feature also exported the user's credentials —
//! and they travelled through any bug report that included the file. It now
//! lives in the OS credential store (Windows Credential Manager, Keychain,
//! Secret Service).
//!
//! Reading degrades rather than fails: a machine with no credential store still
//! runs the app, it just cannot remember the key between sessions.

use keyring::Entry;

const SERVICE: &str = "com.alarmer.smart";
const ACCOUNT: &str = "ai-api-key";

fn entry() -> Result<Entry, String> {
    Entry::new(SERVICE, ACCOUNT).map_err(|e| format!("credential store unavailable: {e}"))
}

/// Stores the key, or clears it when `key` is empty.
pub fn set(key: &str) -> Result<(), String> {
    let entry = entry()?;
    if key.trim().is_empty() {
        // Deleting a missing entry is not an error worth surfacing.
        return match entry.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(format!("could not clear the saved key: {e}")),
        };
    }
    entry
        .set_password(key)
        .map_err(|e| format!("could not save the key: {e}"))
}

/// Reads the stored key. `None` when nothing is stored or the store is absent.
pub fn get() -> Option<String> {
    let entry = entry().ok()?;
    match entry.get_password() {
        Ok(key) if !key.trim().is_empty() => Some(key),
        _ => None,
    }
}

/// True when a key is available, without exposing it.
pub fn has() -> bool {
    get().is_some()
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Round-trips through the real credential store when the platform has one.
    ///
    /// The store is a shared, machine-wide resource, so this restores whatever
    /// was there rather than assuming it started empty.
    #[test]
    fn set_get_and_clear_round_trip() {
        let previous = get();

        if set("sk-alarmer-test-key").is_err() {
            // No credential store on this machine; the app is designed to run
            // without one, so there is nothing to assert.
            return;
        }

        assert_eq!(get().as_deref(), Some("sk-alarmer-test-key"));
        assert!(has());

        set("").expect("clearing must succeed");
        assert_eq!(get(), None);

        // Leave the machine as we found it.
        if let Some(previous) = previous {
            let _ = set(&previous);
        }
    }

    #[test]
    fn an_empty_key_is_never_stored_as_a_real_value() {
        if set("").is_err() {
            return;
        }
        assert_ne!(get().as_deref(), Some(""));
    }
}
