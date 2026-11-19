package vn.edu.hcmut.emobility.core.common;

import java.util.function.Supplier;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * Chạy một khối lệnh trong giao dịch MỚI, độc lập.
 * Dùng cho các luồng có gọi thiết bị IoT: giao dịch 1 (giữ tài nguyên) → gửi lệnh ngoài giao dịch
 * → giao dịch 2 (commit theo kết quả). Không giữ khóa DB trong lúc chờ thiết bị.
 */
@Component
public class TxRunner {

    private final TransactionTemplate requiresNew;

    public TxRunner(PlatformTransactionManager tm) {
        this.requiresNew = new TransactionTemplate(tm);
        this.requiresNew.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public <T> T inNewTx(Supplier<T> work) {
        return requiresNew.execute(status -> work.get());
    }

    public void runInNewTx(Runnable work) {
        requiresNew.execute(status -> {
            work.run();
            return null;
        });
    }
}
