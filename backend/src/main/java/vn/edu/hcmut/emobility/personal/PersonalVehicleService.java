package vn.edu.hcmut.emobility.personal;

import java.util.List;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;
import vn.edu.hcmut.emobility.personal.PersonalDtos.*;

/** PV02: quản lý phương tiện cá nhân. */
@Service
public class PersonalVehicleService {

    static final Set<BookingStatus> HOLDING = Set.of(BookingStatus.BOOKED, BookingStatus.IN_USE, BookingStatus.CHECKOUT_REQUESTED, BookingStatus.AWAITING_EXIT);

    private final PersonalVehicleRepository repo;
    private final SlotBookingRepository bookings;

    public PersonalVehicleService(PersonalVehicleRepository repo, SlotBookingRepository bookings) {
        this.repo = repo;
        this.bookings = bookings;
    }

    @Transactional(readOnly = true)
    public List<PersonalVehicleView> list(Long ownerId) {
        return repo.findByOwnerIdAndActiveTrueOrderById(ownerId).stream().map(this::view).toList();
    }

    @Transactional
    public PersonalVehicleView create(Long ownerId, PersonalVehicleRequest r) {
        String plate = r.plateNumber().toUpperCase().trim();
        if (repo.existsByPlateNumberAndActiveTrue(plate)) throw new BusinessException(ErrorCode.PLATE_NUMBER_TAKEN);
        return view(repo.saveAndFlush(new PersonalVehicle(ownerId, plate, r.type(), r.model(), r.batteryKwh(), r.connectorType())));
    }

    @Transactional
    public PersonalVehicleView update(Long ownerId, Long id, PersonalVehicleRequest r) {
        PersonalVehicle v = owned(ownerId, id);
        String plate = r.plateNumber().toUpperCase().trim();
        if (!plate.equals(v.getPlateNumber()) && repo.existsByPlateNumberAndActiveTrue(plate)) throw new BusinessException(ErrorCode.PLATE_NUMBER_TAKEN);
        v.update(plate, r.type(), r.model(), r.batteryKwh(), r.connectorType());
        repo.flush();
        return view(v);
    }

    @Transactional
    public void delete(Long ownerId, Long id) {
        PersonalVehicle v = owned(ownerId, id);
        if (bookings.existsByPersonalVehicleIdAndStatusIn(id, HOLDING)) throw new BusinessException(ErrorCode.VEHICLE_HAS_BOOKINGS);
        v.deactivate();
    }

    PersonalVehicle owned(Long ownerId, Long id) {
        return repo.findById(id).filter(v -> v.getOwnerId().equals(ownerId) && v.isActive())
                .orElseThrow(() -> BusinessException.notFound("Phương tiện cá nhân", id));
    }

    private PersonalVehicleView view(PersonalVehicle v) {
        return new PersonalVehicleView(v.getId(), v.getPlateNumber(), v.getType(), v.getModel(), v.getBatteryKwh(), v.getConnectorType(),
                bookings.existsByPersonalVehicleIdAndStatusIn(v.getId(), HOLDING));
    }
}
