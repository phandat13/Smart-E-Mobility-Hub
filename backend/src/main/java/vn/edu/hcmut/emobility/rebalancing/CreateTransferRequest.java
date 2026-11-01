package vn.edu.hcmut.emobility.rebalancing;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record CreateTransferRequest(@NotNull Long sourceHubId,
                                    @NotNull Long targetHubId,
                                    @NotEmpty List<@NotNull Long> vehicleIds,
                                    Long alertId,
                                    Long recommendationId) {}
