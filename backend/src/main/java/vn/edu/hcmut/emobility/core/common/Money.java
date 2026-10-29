package vn.edu.hcmut.emobility.core.common;

import jakarta.persistence.Embeddable;
import java.math.BigDecimal;
import java.math.RoundingMode;

@Embeddable
public record Money(BigDecimal amount) {
    public static final Money ZERO = new Money(BigDecimal.ZERO);

    public Money {
        if (amount == null) amount = BigDecimal.ZERO;
        if (amount.signum() < 0) throw new IllegalArgumentException("Số tiền không được âm");
        amount = amount.setScale(2, RoundingMode.HALF_UP);
    }

    public static Money vnd(long value) {
        return new Money(BigDecimal.valueOf(value));
    }

    public Money plus(Money other) {
        return new Money(amount.add(other.amount));
    }

    public Money times(Money other) {
        return new Money(amount.multiply(other.amount));
    }
}