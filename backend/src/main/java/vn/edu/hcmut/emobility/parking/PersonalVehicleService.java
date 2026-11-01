package vn.edu.hcmut.emobility.parking;

import java.util.List;
import java.util.Locale;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.hcmut.emobility.core.exception.BusinessException;
import vn.edu.hcmut.emobility.core.exception.ErrorCode;

@Service
public class PersonalVehicleService {

    private final PersonalVehicleRepository vehicles;
    private final SlotBookingRepository bookings;

    public PersonalVehicleService(PersonalVehicleRepository vehicles, SlotBookingRepository bookings) {
        this.vehicles = vehicles;
        this.bookings = bookings;
    }

    /** Đăng ký xe cá nhân; biển số là duy nhất trên toàn hệ thống. */
    @Transactional
    public PersonalVehicle register(Long ownerId, RegisterVehicleRequest req) {
        String plate = normalize(req.plateNumber());
        if (vehicles.existsByPlateNumber(plate)) {
            throw new BusinessException(ErrorCode.PLATE_NUMBER_TAKEN);
        }
        PersonalVehicle v = PersonalVehicle.register(ownerId, plate, normalize(req.type()),
                req.batteryKwh(), normalize(req.connectorType()));
        try {
            return vehicles.saveAndFlush(v);
        } catch (DataIntegrityViolationException ex) {
            // Hai người đăng ký cùng biển số cùng lúc: unique constraint trên DB chặn người sau.
            throw new BusinessException(ErrorCode.PLATE_NUMBER_TAKEN);
        }
    }

    @Transactional(readOnly = true)
    public List<PersonalVehicle> mine(Long ownerId) {
        return vehicles.findByOwnerIdOrderByIdDesc(ownerId);
    }

    @Transactional
    public void delete(Long ownerId, Long vehicleId) {
        PersonalVehicle v = vehicles.findByIdAndOwnerId(vehicleId, ownerId)
                .orElseThrow(() -> BusinessException.notFound("Xe cá nhân", vehicleId));
        if (bookings.existsByPersonalVehicleIdAndStatusIn(v.getId(), BookingStatus.ACTIVE)) {
            throw new BusinessException(ErrorCode.VEHICLE_HAS_BOOKINGS);
        }
        // slot_booking tham chiếu khóa ngoại tới xe, nên xe đã có lịch sử thì không xóa cứng được.
        if (bookings.existsByPersonalVehicleId(v.getId())) {
            throw new BusinessException(ErrorCode.CONFLICT, "Xe đã có lịch sử đặt chỗ nên không thể xóa");
        }
        vehicles.delete(v);
    }

    private static String normalize(String s) {
        return s.trim().toUpperCase(Locale.ROOT);
    }
}
