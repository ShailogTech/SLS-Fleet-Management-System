async def get_incharge_plant_names(db, user_id: str, user_plant: str = None):
    """Get all plant names managed by a plant_incharge user.

    Checks both:
    - Plants where plant_incharge_id matches the user
    - The user's own 'plant' field (legacy single-plant link)

    Returns a list of plant name strings.
    """
    plant_names = set()

    # Add user's own plant field
    if user_plant:
        plant_names.add(user_plant)

    # Find all plants where this user is the incharge
    plants = await db.plants.find(
        {"plant_incharge_id": user_id, "is_active": True},
        {"_id": 0, "plant_name": 1}
    ).to_list(1000)

    for p in plants:
        if p.get("plant_name"):
            plant_names.add(p["plant_name"])

    return list(plant_names)
