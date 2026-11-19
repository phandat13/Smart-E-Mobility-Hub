package vn.edu.hcmut.emobility.core.iot;

/** Trạng thái vật lý đọc lại từ thiết bị khi đối soát. */
public record DeviceState(LockState lockState, Boolean powerOn) {}
