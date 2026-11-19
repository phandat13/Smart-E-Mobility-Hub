package vn.edu.hcmut.emobility.hub;

/** HELD = đã được giữ cho xe đang điều chuyển tới (góp ý #10) – không dùng cho trả xe/đặt chỗ khác. */
public enum SlotStatus { AVAILABLE, HELD, OCCUPIED, PENDING_CHECK, FAULTY, DISABLED }
