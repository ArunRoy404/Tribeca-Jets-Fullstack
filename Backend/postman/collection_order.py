"""
Where a builder puts the folder it just rebuilt.

Folders are serial-numbered (`03 · Clients`, `10 · Quotes`) so the collection
reads in execution order. Every builder used to remove its old folder and
`append` the new one — so whichever builder ran last jumped to the end, and
`10 · Quotes` sat after `13 · Client Credits` without anyone deciding it
should. Replacing in place, then ordering by the serial number, keeps the
collection in the order its names promise however many builders run and in
whatever order.
"""


def place_folder(collection: dict, folder: dict) -> None:
    """Replaces the folder with the same serial number, keeping numeric order."""
    serial = folder['name'].split(' ', 1)[0]
    collection['item'] = [
        f for f in collection['item'] if f['name'].split(' ', 1)[0] != serial
    ]
    collection['item'].append(folder)
    collection['item'].sort(key=lambda f: f['name'].split(' ', 1)[0])
