function groupRoomsByFacility(rooms) {
  const roomsByFacility = new Map();

  for (const room of rooms || []) {
    const facilityRooms = roomsByFacility.get(room?.facility) || [];
    facilityRooms.push(room);
    roomsByFacility.set(room?.facility, facilityRooms);
  }

  for (const facilityRooms of roomsByFacility.values()) {
    facilityRooms.sort(
      (left, right) =>
        Number(left?.stationIndex || 0) - Number(right?.stationIndex || 0),
    );
  }

  return roomsByFacility;
}

export function getRiicLayoutCells(rooms = []) {
  const roomsByFacility = groupRoomsByFacility(rooms);
  const productionRooms = (rooms || []).filter((room) =>
    ["trading", "manufacture", "power"].includes(room?.facility),
  );
  const getFacilityRoom = (facility, index = 0) =>
    (roomsByFacility.get(facility) || [])[index] || null;
  const cells = Array(25).fill(null);

  cells[3] = getFacilityRoom("control");
  cells[4] = getFacilityRoom("meeting");
  cells[5] = productionRooms[0] || null;
  cells[6] = productionRooms[1] || null;
  cells[7] = productionRooms[2] || null;
  cells[8] = getFacilityRoom("dormitory", 0);
  cells[9] = getFacilityRoom("processing");
  cells[10] = productionRooms[3] || null;
  cells[11] = productionRooms[4] || null;
  cells[12] = productionRooms[5] || null;
  cells[13] = getFacilityRoom("dormitory", 1);
  cells[14] = getFacilityRoom("office");
  cells[15] = productionRooms[6] || null;
  cells[16] = productionRooms[7] || null;
  cells[17] = productionRooms[8] || null;
  cells[18] = getFacilityRoom("dormitory", 2);
  cells[19] = getFacilityRoom("training");
  cells[23] = getFacilityRoom("dormitory", 3);

  return cells;
}
